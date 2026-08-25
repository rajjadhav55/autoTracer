import json
import logging
import os

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


def _build_triage_prompt(incident: "Incident") -> str:
    """Construct the user-facing prompt from incident data."""
    sections = [
        f"## Exception\n"
        f"**Type:** {incident.error_type}\n"
        f"**Message:** {incident.error_message}",
        f"## Stack Trace\n```\n{incident.traceback}\n```",
    ]

    if incident.endpoint:
        sections.append(
            f"## Request\n"
            f"**Method:** {incident.http_method or 'N/A'}  \n"
            f"**Endpoint:** {incident.endpoint}"
        )

    if incident.request_payload:
        sections.append(
            f"## Request Payload (sanitized)\n"
            f"```json\n{json.dumps(incident.request_payload, indent=2)}\n```"
        )

    return "\n\n".join(sections)


def _parse_llm_response(raw_text: str) -> dict:
    """Best-effort extraction of JSON from the LLM response.

    Handles cases where the model wraps the JSON in markdown fences.
    """
    text = raw_text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Fallback: treat entire response as root_cause
        return {
            "root_cause": raw_text.strip(),
            "suggested_fix": "",
        }


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_incident_task(self, incident_id):
    """Perform AI-powered triage on an Incident.

    1. Fetch the Incident and set status → ANALYZING.
    2. Build a prompt from the crash data.
    3. Call Google Gemini via LangChain for root-cause analysis.
    4. Parse the LLM response and save root_cause + suggested_fix.
    5. Set status → TRIAGED (or FAILED on error).
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
        "[AutoTrace] Picked up Incident %s (%s) for triage.",
        incident.id, incident.error_type,
    )

    # ── Call the LLM ────────────────────────────────────────────────────
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            google_api_key=_GOOGLE_API_KEY,
            temperature=0.2,
            max_output_tokens=1024,
            convert_system_message_to_human=True,
        )

        user_prompt = _build_triage_prompt(incident)
        messages = [
            ("system", _TRIAGE_SYSTEM_PROMPT),
            ("human", user_prompt),
        ]

        response = llm.invoke(messages)
        raw_text = response.content

        logger.debug("[AutoTrace] Raw LLM response for %s: %s", incident.id, raw_text)

        # ── Parse and persist ───────────────────────────────────────────
        parsed = _parse_llm_response(raw_text)

        incident.root_cause = parsed.get("root_cause", raw_text)
        incident.suggested_fix = parsed.get("suggested_fix", "")
        incident.diagnostic_logs = {
            **incident.diagnostic_logs,
            "llm_raw_response": raw_text,
            "llm_model": "gemini-3.6-flash",
        }
        incident.status = "TRIAGED"
        incident.save(update_fields=[
            "root_cause", "suggested_fix", "diagnostic_logs", "status",
        ])

        logger.info("[AutoTrace] Finished triage for Incident %s.", incident.id)
        return {"status": "success", "incident_id": str(incident.id)}

    except Exception as exc:
        logger.error(
            "[AutoTrace] LLM triage failed for Incident %s: %s",
            incident_id, exc,
            exc_info=True,
        )
        incident.status = "FAILED"
        incident.diagnostic_logs = {
            **incident.diagnostic_logs,
            "triage_error": str(exc),
        }
        incident.save(update_fields=["status", "diagnostic_logs"])
        return {"status": "failed", "incident_id": str(incident_id), "error": str(exc)}


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