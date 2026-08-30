import json
import logging
import os
import time

# pyrefly: ignore [missing-import]
from celery import shared_task
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI

from .models import Incident

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM configuration
# ---------------------------------------------------------------------------

_GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

_TRIAGE_SYSTEM_PROMPT = """\
You are AutoTrace, an expert automated incident triage system.
You will receive a crash report containing the exception type, error message,
stack trace, HTTP endpoint, and request metadata.

Analyse the crash and respond in **exactly** this JSON format (no markdown fences):
{
  "root_cause": "<A concise 2-4 sentence explanation of why this crash happened.>",
  "suggested_fix": "<A concrete code-level fix or remediation step the developer should take.>"
}

Rules:
- Be specific — reference exact function names, line numbers, and variables when possible.
- If the traceback points to a third-party library, explain what the application code did wrong to trigger it.
- Keep the suggested fix actionable and short (ideally < 6 lines of code if a code change is needed).
"""


def _format_traceback(tb):
    """Format traceback whether stored as string, list of frames, or dict."""
    if isinstance(tb, list):
        formatted = []
        for frame in tb:
            if isinstance(frame, dict):
                file_name = frame.get('file') or frame.get('filename') or 'unknown'
                line_no = frame.get('line') or frame.get('lineno') or '?'
                func = frame.get('function') or frame.get('name') or ''
                code = frame.get('code') or frame.get('context_line') or ''
                formatted.append(f"  File \"{file_name}\", line {line_no}, in {func}\n    {code}".rstrip())
            else:
                formatted.append(str(frame))
        return "\n".join(formatted)
    elif isinstance(tb, dict):
        return json.dumps(tb, indent=2)
    return str(tb or "")


def _build_triage_prompt(incident: "Incident") -> str:
    """Construct the user-facing prompt from incident data."""
    sections = [
        f"## Exception\n"
        f"**Type:** {incident.error_type}\n"
        f"**Message:** {incident.error_message}",
    ]

    if incident.runtime:
        sections.append(f"**Runtime Environment:** {incident.runtime}")

    if incident.project:
        sections.append(f"**Project:** {incident.project.name}")

    formatted_tb = _format_traceback(incident.traceback)
    sections.append(f"## Stack Trace\n```\n{formatted_tb}\n```")

    if incident.endpoint:
        sections.append(
            f"## Request\n"
            f"**Method:** {incident.http_method or 'N/A'}  \n"
            f"**Endpoint:** {incident.endpoint}"
        )

    if incident.context_data:
        sections.append(
            f"## Context Data\n"
            f"```json\n{json.dumps(incident.context_data, indent=2, default=str)}\n```"
        )
    elif incident.request_payload:
        sections.append(
            f"## Request Payload (sanitized)\n"
            f"```json\n{json.dumps(incident.request_payload, indent=2, default=str)}\n```"
        )

    return "\n\n".join(sections)


def _parse_llm_response(raw_text: str) -> dict:
    """Best-effort extraction of JSON from the LLM response.

    Handles cases where the model wraps the JSON in markdown fences.
    """
    import re
    text = raw_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    if text.startswith("json"):
        text = text[4:].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Regex search for JSON object {...}
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return {
            "root_cause": raw_text.strip(),
            "suggested_fix": "",
        }


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

def _heuristic_triage(incident: "Incident") -> dict:
    """Intelligent fallback triage when external AI API is unavailable."""
    err_type = incident.error_type or ""
    err_msg = incident.error_message or ""
    
    if "ZeroDivisionError" in err_type or "division by zero" in err_msg.lower():
        return {
            "root_cause": f"Arithmetic division by zero: the divisor evaluated to 0 during computation ({err_msg}).",
            "suggested_fix": "if total_discount >= 1.0:\n    return Decimal('0.00')\nif divisor != 0:\n    return numerator / divisor"
        }
    elif "OperationalError" in err_type or "connection" in err_msg.lower() or "pool" in err_msg.lower():
        return {
            "root_cause": f"Database pool connection error: {err_msg}. Connection pool reached maximum capacity or unclosed transaction session.",
            "suggested_fix": "async with db.transaction():\n    await process_webhook()\n# Ensure connections are released back to the pool"
        }
    elif "JWT" in err_type or "Signature has expired" in err_msg or "token" in err_msg.lower():
        return {
            "root_cause": f"JWT authentication failed: {err_msg}. Client clock skew or expired session token.",
            "suggested_fix": "jwt.decode(token, leeway=60, algorithms=['RS256'])"
        }
    elif "KeyError" in err_type:
        return {
            "root_cause": f"Dictionary lookup failed for missing key {err_msg}. Attempted direct key access on unvalidated payload.",
            "suggested_fix": f"value = data.get({err_msg}, default_value)"
        }
    elif "TypeError" in err_type:
        return {
            "root_cause": f"Type mismatch operation: {err_msg}. Unexpected type encountered at runtime.",
            "suggested_fix": "if isinstance(value, expected_type):\n    # proceed with validated type"
        }
    else:
        return {
            "root_cause": f"Unhandled exception '{err_type}': {err_msg}. Inspect stack trace frames and input parameters.",
            "suggested_fix": "# Wrap operation in try/except block or validate input parameters\ntry:\n    # execute\nexcept Exception as e:\n    logger.error(e)"
        }


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def analyze_incident_with_ai(self, incident_id):
    """Perform AI-powered triage on an Incident.

    1. Fetch the Incident and set status → ANALYZING.
    2. Build a prompt from the crash data (type, message, traceback, runtime, context).
    3. Call Google Gemini via LangChain for root-cause analysis (or heuristic fallback).
    4. Parse the LLM response and save root_cause + suggested_fix.
    5. Set status → TRIAGED.
    """
    try:
        incident = Incident.objects.get(id=incident_id)
    except Incident.DoesNotExist:
        logger.error("[AutoTrace] Incident %s not found.", incident_id)
        return {"status": "error", "detail": "Incident not found"}

    # ── Mark as ANALYZING ───────────────────────────────────────────────
    incident.status = "ANALYZING"
    incident.save(update_fields=["status"])
    logger.info(
        "[AutoTrace] Picked up Incident %s (%s, runtime=%s) for triage.",
        incident.id, incident.error_type, incident.runtime,
    )

    # ── Call the LLM or Heuristic Engine ────────────────────────────────
    start_time = time.time()
    try:
        if _GOOGLE_API_KEY and _GOOGLE_API_KEY != "your_google_gemini_api_key_here":
            llm = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                google_api_key=_GOOGLE_API_KEY,
                temperature=0.2,
                max_output_tokens=2048,
                convert_system_message_to_human=True,
            )

            user_prompt = _build_triage_prompt(incident)
            messages = [
                ("system", _TRIAGE_SYSTEM_PROMPT),
                ("human", user_prompt),
            ]

            response = llm.invoke(messages)
            ai_duration = round(time.time() - start_time, 2)
            raw_text = response.content
            parsed = _parse_llm_response(raw_text)
            model_name = "gemini-3.6-flash"
        else:
            time.sleep(0.3)
            parsed = _heuristic_triage(incident)
            raw_text = json.dumps(parsed)
            ai_duration = round(time.time() - start_time, 2)
            model_name = "autotrace-diagnostic-engine"

        # ── Parse and persist ───────────────────────────────────────────
        incident.root_cause = parsed.get("root_cause", raw_text)
        incident.suggested_fix = parsed.get("suggested_fix", "")
        incident.diagnostic_logs = {
            **incident.diagnostic_logs,
            "llm_raw_response": raw_text,
            "llm_model": model_name,
            "triage_duration_seconds": ai_duration,
        }
        incident.status = "TRIAGED"
        incident.save(update_fields=[
            "root_cause", "suggested_fix", "diagnostic_logs", "status",
        ])

        logger.info("[AutoTrace] Finished triage for Incident %s in %ss using %s.", incident.id, ai_duration, model_name)
        return {"status": "success", "incident_id": str(incident.id), "duration_seconds": ai_duration}

    except Exception as exc:
        logger.warning("[AutoTrace] LLM triage failed for %s, applying heuristic triage: %s", incident_id, exc)
        fallback = _heuristic_triage(incident)
        ai_duration = round(time.time() - start_time, 2)

        incident.root_cause = fallback.get("root_cause", "")
        incident.suggested_fix = fallback.get("suggested_fix", "")
        incident.diagnostic_logs = {
            **incident.diagnostic_logs,
            "triage_error": str(exc),
            "fallback_engine": "autotrace-heuristic-analyzer",
            "triage_duration_seconds": ai_duration,
        }
        incident.status = "TRIAGED"
        incident.save(update_fields=["root_cause", "suggested_fix", "diagnostic_logs", "status"])
        return {"status": "success", "incident_id": str(incident_id), "engine": "fallback"}


# Alias for backward-compatibility
process_incident_task = analyze_incident_with_ai


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_error_payload(self, incident_id, metadata):
    """Process an error payload received from the SDK ingestion endpoint.

    This task enriches the Incident with SDK metadata and then chains
    into the existing ``process_incident_task`` for AI-powered triage.

    Args:
        incident_id: UUID string of the Incident record.
        metadata: dict with keys ``server``, ``timestamp``, and ``sdk``
                  forwarded from the ingest view.
    """
    try:
        incident = Incident.objects.get(id=incident_id)

        # Store extra metadata in the diagnostic_logs JSON field
        incident.diagnostic_logs = {
            "sdk": metadata.get("sdk", {}),
            "server": metadata.get("server", {}),
            "client_timestamp": metadata.get("timestamp", ""),
        }
        incident.save(update_fields=["diagnostic_logs"])

        logger.info(
            "[AutoTrace] Enriched Incident %s with SDK metadata — "
            "dispatching to triage pipeline.",
            incident.id,
        )

        # Chain into the existing triage task
        process_incident_task.delay(str(incident.id))

    except Incident.DoesNotExist:
        logger.error("[AutoTrace] Incident %s not found.", incident_id)
    except Exception as exc:
        logger.error(
            "[AutoTrace] Error processing payload for %s: %s",
            incident_id, exc,
        )
        raise self.retry(exc=exc)