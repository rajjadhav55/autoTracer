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