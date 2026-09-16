import json
import logging
import os
import threading
import time
import urllib.parse
import requests

# pyrefly: ignore [missing-import]
from celery import shared_task
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI

from .models import ErrorLog, Incident

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM configuration
# ---------------------------------------------------------------------------

_GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

_TRIAGE_PROMPT_TEMPLATE = """You are an expert Python debugging assistant for an automated crash remediation pipeline. 
Your job is to analyze the provided stack trace and generate a precise code patch.

CRITICAL INSTRUCTION: You MUST respond ONLY with a valid, parseable JSON object. 
Do not include conversational text, do not add explanations outside the JSON, and do not use markdown formatting blocks like ```json.

The JSON object must strictly follow this exact schema:
{
  "root_cause_explanation": "A concise 1-2 sentence explanation of why the crash occurred.",
  "file_path": "The exact relative path to the file that needs fixing (e.g., 'ticket_booking/views.py'). Do not guess; extract this directly from the stack trace.",
  "code_patch": "The exact corrected Python code snippet to replace the broken logic."
}

Stack Trace to analyze:
<INSERT_STACK_TRACE_HERE>
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
    """Construct the final prompt by injecting actual stack trace into the template."""
    formatted_tb = _format_traceback(incident.traceback)
    
    sections = [
        f"Exception Type: {incident.error_type}",
        f"Exception Message: {incident.error_message}",
    ]
    if incident.runtime:
        sections.append(f"Runtime: {incident.runtime}")
    if incident.endpoint:
        sections.append(f"Endpoint: {incident.http_method or 'GET'} {incident.endpoint}")
    if formatted_tb:
        sections.append(f"\nTraceback (most recent call last):\n{formatted_tb}")
    if incident.context_data:
        sections.append(f"\nContext Data:\n{json.dumps(incident.context_data, indent=2, default=str)}")

    actual_error_variable = "\n".join(sections)
    return _TRIAGE_PROMPT_TEMPLATE.replace("<INSERT_STACK_TRACE_HERE>", str(actual_error_variable))


def _parse_llm_response(raw_text: str) -> dict:
    """Best-effort extraction of JSON from the LLM response.

    Handles cases where the model wraps the JSON in markdown fences.
    Supports both the precise schema (root_cause_explanation, file_path, code_patch)
    and legacy fields.
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

    parsed = {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Regex search for JSON object {...}
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                parsed = json.loads(match.group(0))
            except Exception:
                parsed = {}

    root_cause = (
        parsed.get("root_cause_explanation")
        or parsed.get("root_cause")
        or (raw_text.strip() if not parsed else "")
    )
    suggested_fix = (
        parsed.get("code_patch")
        or parsed.get("suggested_fix")
        or ""
    )
    file_path = parsed.get("file_path", "")
    unified_diff = parsed.get("unified_diff", "")

    return {
        "root_cause": root_cause,
        "root_cause_explanation": root_cause,
        "suggested_fix": suggested_fix,
        "code_patch": suggested_fix,
        "file_path": file_path,
        "unified_diff": unified_diff,
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


# ---------------------------------------------------------------------------
# Auto-Remediation GitHub PR Webhook Dispatcher
# ---------------------------------------------------------------------------

def _parse_autotrace_dsn():
    """Parse AUTOTRACE_DSN or fallback environment variables.

    DSN Format: autotrace://[secret]@[domain]/[repo_owner]/[repo_name]
    Returns: (webhook_url, secret, target_repo)
    """
    dsn = os.environ.get("AUTOTRACE_DSN", "").strip()
    webhook_url = os.environ.get("AUTOTRACE_WEBHOOK_URL", "").strip()
    secret = os.environ.get("AUTOTRACE_WEBHOOK_SECRET", "").strip()
    target_repo = os.environ.get("AUTOTRACE_TARGET_REPO", "").strip()

    if dsn:
        try:
            parsed = urllib.parse.urlparse(dsn)
            netloc = parsed.netloc
            if "@" in netloc:
                secret_part, domain_part = netloc.rsplit("@", 1)
                secret = urllib.parse.unquote(secret_part)
                domain = domain_part
            else:
                domain = netloc

            if domain:
                scheme = "http" if domain.startswith("localhost") or domain.startswith("127.0.0.1") else "https"
                webhook_url = f"{scheme}://{domain}/api/webhooks/github-pr"

            repo_path = parsed.path.strip("/")
            if repo_path and not target_repo:
                target_repo = repo_path
        except Exception as exc:
            logger.warning("[AutoTrace] Failed to parse AUTOTRACE_DSN '%s': %s", dsn, exc)

    # If AUTOTRACE_TARGET_REPO is explicitly set in env, it overrides or provides target_repo
    env_target_repo = os.environ.get("AUTOTRACE_TARGET_REPO", "").strip()
    if env_target_repo:
        target_repo = env_target_repo
    elif not target_repo:
        target_repo = "rajjadhav55/autoTracer"

    return webhook_url, secret, target_repo


def _extract_affected_file(incident: "Incident", target_repo: str = "") -> tuple:
    """Extract innermost application source file, line number, and code snippet from traceback.

    Returns: (normalized_file_path, line_no, code_snippet)
    """
    tb = incident.traceback
    frames = []
    if isinstance(tb, list):
        frames = tb
    elif isinstance(tb, dict) and "frames" in tb:
        frames = tb.get("frames", [])

    ignored_keywords = [
        "site-packages", "dist-packages", "lib/python", "python3",
        "celery", "django", "<frozen", "<string>", "threading.py",
        "wsgiref", "rest_framework", "socketserver",
    ]

    selected_frame = None
    for frame in reversed(frames):
        if not isinstance(frame, dict):
            continue
        file_path = frame.get("file") or frame.get("filename") or ""
        norm_file = file_path.replace("\\", "/").lower()
        if any(kw in norm_file for kw in ignored_keywords):
            continue
        selected_frame = frame
        break

    if not selected_frame and frames:
        for f in reversed(frames):
            if isinstance(f, dict) and (f.get("file") or f.get("filename")):
                selected_frame = f
                break

    if not selected_frame:
        return ("", 1, "")

    raw_path = selected_frame.get("file") or selected_frame.get("filename") or ""
    line_no = selected_frame.get("line") or selected_frame.get("lineno") or 1
    code = selected_frame.get("code") or selected_frame.get("context_line") or ""

    path = raw_path.replace("\\", "/")
    if ":" in path or path.startswith("/"):
        if target_repo and "filmingo-frontend" in target_repo:
            if "/src/" in path:
                path = path[path.index("/src/") + 1:]
        for marker in ["/backend/", "/frontend/", "/sdk/", "/api/"]:
            if marker in path:
                path = path[path.index(marker) + 1:]
                break
        else:
            if "/src/" in path:
                path = path[path.index("/src/") + 1:]
            else:
                parts = path.split("/")
                path = "/".join(parts[-3:]) if len(parts) >= 3 else parts[-1]

    return (path, line_no, code)


def _format_unified_diff(file_path: str, line_no: int, old_code: str, fix_code: str, raw_diff: str = "") -> str:
    """Format unified diff with standard @@ hunk headers."""
    if raw_diff and "@@" in raw_diff:
        return raw_diff

    line_no = max(1, int(line_no or 1))
    old_lines = old_code.splitlines() if old_code else ["# problematic code line"]
    fix_lines = fix_code.splitlines() if fix_code else ["# auto-remediation fix applied"]

    diff_lines = [
        f"--- a/{file_path}",
        f"+++ b/{file_path}",
        f"@@ -{line_no},{len(old_lines)} +{line_no},{len(fix_lines)} @@",
    ]
    for line in old_lines:
        diff_lines.append(f"-{line}")
    for line in fix_lines:
        diff_lines.append(f"+{line}")
    return "\n".join(diff_lines)


def _dispatch_webhook_pr(incident: "Incident", unified_diff: str = "", file_path: str = ""):
    """Fire-and-forget webhook dispatch to Vercel to open an automated GitHub PR."""
    webhook_url, secret, target_repo = _parse_autotrace_dsn()

    if not webhook_url or not secret:
        logger.debug(
            "[AutoTrace] Webhook PR skipped: AUTOTRACE_DSN or webhook credentials not configured."
        )
        return

    extracted_file, line_no, old_code = _extract_affected_file(incident, target_repo)
    final_file_path = file_path or extracted_file
    if not final_file_path:
        logger.warning(
            "[AutoTrace] Webhook PR skipped: unable to determine affected file path for incident %s",
            incident.id,
        )
        return

    final_diff = _format_unified_diff(
        final_file_path, line_no, old_code, incident.suggested_fix or "", unified_diff
    )

    payload = {
        "incident_id": str(incident.id),
        "error_type": incident.error_type,
        "error_message": incident.error_message,
        "file_path": final_file_path,
        "unified_diff": final_diff,
        "ai_root_cause_summary": incident.root_cause or "Automated triage detected exception.",
        "target_repo": target_repo,
        "stack_trace": _format_traceback(incident.traceback),
        "reviewers": ["rajjadhav55"],
    }

    def _send():
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Secret": secret,
                "Authorization": f"Bearer {secret}",
            }
            resp = requests.post(webhook_url, json=payload, headers=headers, timeout=5)
            if resp.status_code in (200, 201):
                logger.info(
                    "[AutoTrace] Auto-remediation PR webhook triggered successfully for incident %s: %s",
                    incident.id, resp.json().get("pr_url", "OK"),
                )
            else:
                logger.warning(
                    "[AutoTrace] Webhook server responded %s: %s",
                    resp.status_code, resp.text,
                )
        except Exception as exc:
            logger.warning("[AutoTrace] Failed to send auto-remediation webhook to %s: %s", webhook_url, exc)

    thread = threading.Thread(
        target=_send,
        daemon=True,
        name=f"autotrace-webhook-{incident.id}",
    )
    thread.start()


def run_ai_triage_sync(incident_id):
    """Perform AI-powered triage synchronously on an Incident.

    1. Fetch the Incident and set status → ANALYZING.
    2. Build a prompt from the crash data (type, message, traceback, runtime, context).
    3. Call Google Gemini via LangChain for root-cause analysis (or heuristic fallback).
    4. Parse the LLM response and save root_cause + suggested_fix.
    5. Set status → TRIAGED and sync ErrorLog.
    6. Dispatch auto-remediation webhook to Vercel to open GitHub PR.
    """
    try:
        incident = Incident.objects.get(id=incident_id)
    except Incident.DoesNotExist:
        logger.error("[AutoTrace] Incident %s not found.", incident_id)
        return {"status": "error", "detail": "Incident not found"}

    # ── Mark as ANALYZING ───────────────────────────────────────────────
    incident.status = "ANALYZING"
    incident.save(update_fields=["status"])
    ErrorLog.objects.filter(id=incident.id).update(status="ANALYZING")
    logger.info(
        "[AutoTrace] Picked up Incident %s (%s, runtime=%s) for triage.",
        incident.id, incident.error_type, incident.runtime,
    )

    # ── Call the LLM or Heuristic Engine ────────────────────────────────
    start_time = time.time()
    try:
        if _GOOGLE_API_KEY and _GOOGLE_API_KEY != "your_google_gemini_api_key_here":
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=_GOOGLE_API_KEY,
                temperature=0.1,
                max_output_tokens=2048,
            )

            final_prompt = _build_triage_prompt(incident)
            response = llm.invoke(final_prompt)
            ai_duration = round(time.time() - start_time, 2)
            raw_text = response.content
            parsed = _parse_llm_response(raw_text)
            model_name = "gemini-2.5-flash"
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
        ErrorLog.objects.filter(id=incident.id).update(status="TRIAGED")

        logger.info("[AutoTrace] Finished triage for Incident %s in %ss using %s.", incident.id, ai_duration, model_name)
        _dispatch_webhook_pr(
            incident,
            unified_diff=parsed.get("unified_diff", ""),
            file_path=parsed.get("file_path", ""),
        )
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
        ErrorLog.objects.filter(id=incident.id).update(status="TRIAGED")
        _dispatch_webhook_pr(incident, fallback.get("unified_diff", ""))
        return {"status": "success", "incident_id": str(incident_id), "engine": "fallback"}


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def analyze_incident_with_ai(self, incident_id):
    """Celery task wrapper for AI-powered triage."""
    return run_ai_triage_sync(incident_id)


# Aliases for backward-compatibility & external task naming conventions
process_incident_task = analyze_incident_with_ai
run_ai_triage_task = analyze_incident_with_ai


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

        # Chain into the existing triage task with fallback to synchronous execution
        try:
            process_incident_task.delay(str(incident.id))
        except Exception:
            run_ai_triage_sync(str(incident.id))

    except Incident.DoesNotExist:
        logger.error("[AutoTrace] Incident %s not found.", incident_id)
    except Exception as exc:
        logger.error(
            "[AutoTrace] Error processing payload for %s: %s",
            incident_id, exc,
        )
        raise self.retry(exc=exc)