import logging
# pyrefly: ignore [missing-import]
from celery import shared_task
from .models import Incident

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_incident_task(self, incident_id):
    try:
        incident = Incident.objects.get(id=incident_id)
        incident.status = 'ANALYZING'
        incident.save(update_fields=['status'])

        logger.info(f"[AutoTrace] Picked up Incident {incident.id} ({incident.error_type}) for triage.")

        # Placeholder: This is where LangGraph agent diagnosis will run later
        incident.root_cause = f"AutoTrace worker captured exception: {incident.error_message}"
        incident.status = 'TRIAGED'
        incident.save(update_fields=['root_cause', 'status'])

        logger.info(f"[AutoTrace] Finished triage for Incident {incident.id}.")
        return {"status": "success", "incident_id": str(incident.id)}

    except Incident.DoesNotExist:
        logger.error(f"[AutoTrace] Incident {incident_id} not found.")
    except Exception as exc:
        logger.error(f"[AutoTrace] Error processing incident {incident_id}: {exc}")
        raise self.retry(exc=exc)


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