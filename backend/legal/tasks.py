from celery import shared_task

from legal.cleanup import CleanupRetry, HealthDataCleanupService

MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 60


@shared_task(
    bind=True,
    name="legal.cleanup_health_data",
    max_retries=MAX_RETRIES,
    default_retry_delay=RETRY_BACKOFF_SECONDS,
    ignore_result=True,
)
def cleanup_health_data_task(self, job_id: int):
    try:
        HealthDataCleanupService.run_job(job_id)
    except CleanupRetry as exc:
        if self.request.retries >= self.max_retries:
            HealthDataCleanupService.mark_failed(job_id, exc.code)
            return
        raise self.retry(exc=exc, countdown=RETRY_BACKOFF_SECONDS * (2 ** self.request.retries))
