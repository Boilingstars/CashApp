from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from finance.models import Operation


@receiver(post_save, sender=Operation)
@receiver(post_delete, sender=Operation)
def refresh_dbi_on_operation_change(sender, instance, **kwargs):
    from .services import recalculate_dbi_for_user

    op_date = instance.operation_date
    if hasattr(op_date, 'date'):
        op_date = op_date.date()
    recalculate_dbi_for_user(
        instance.user_id,
        year=op_date.year,
        month=op_date.month,
        sync_rag=False,
    )
