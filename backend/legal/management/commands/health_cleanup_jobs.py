from django.core.management.base import BaseCommand

from legal.cleanup import HealthDataCleanupService, overdue_cleanup_jobs, reapply_privacy_suppressions
from legal.models import HealthDataDeletionJob


class Command(BaseCommand):
    help = "Lista trabajos de limpieza de salud. No borra en masa."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--status", default="")
        parser.add_argument("--job-id", type=int)
        parser.add_argument("--overdue", action="store_true")
        parser.add_argument("--reapply", action="store_true")

    def handle(self, *args, **options):
        if options["reapply"]:
            self.stdout.write(f"reapplied={reapply_privacy_suppressions()}")
            return
        if options["overdue"]:
            self.stdout.write(f"overdue={overdue_cleanup_jobs().count()}")
            return
        if options["job_id"]:
            jobs = HealthDataDeletionJob.objects.filter(pk=options["job_id"])
        elif options["status"]:
            jobs = HealthDataDeletionJob.objects.filter(status=options["status"])
        else:
            self.stderr.write("Indica --status, --job-id o --overdue.")
            return
        for job in jobs.order_by("id"):
            self.stdout.write(
                f"id={job.id} purpose={job.purpose} status={job.status} "
                f"generation={job.generation} attempts={job.attempts}"
            )
        if options["dry_run"] or not options["job_id"]:
            return
        job = jobs.first()
        if job is None or job.status != "failed":
            return
        from legal.cleanup import CleanupRetry

        try:
            HealthDataCleanupService.run_job(job.id)
        except CleanupRetry as exc:
            HealthDataCleanupService.mark_failed(job.id, exc.code)
