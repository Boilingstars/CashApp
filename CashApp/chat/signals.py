import logging

from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from finance.models import FinancialProduct, UpcomingPayment

logger = logging.getLogger(__name__)


def _schedule_sync(user_id: int):
    if settings.RAG_BACKEND != 'redis_vector':
        return
    from .indexing import sync_user_financial_chunks

    try:
        sync_user_financial_chunks(user_id)
    except Exception as exc:
        logger.error('RAG sync failed for user %s: %s', user_id, exc)


@receiver(post_save, sender=FinancialProduct)
@receiver(post_delete, sender=FinancialProduct)
def on_financial_product_change(sender, instance, **kwargs):
    _schedule_sync(instance.user_id)


@receiver(post_save, sender=UpcomingPayment)
@receiver(post_delete, sender=UpcomingPayment)
def on_upcoming_payment_change(sender, instance, **kwargs):
    _schedule_sync(instance.user_id)
