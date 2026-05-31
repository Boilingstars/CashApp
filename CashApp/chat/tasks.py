import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def sync_user_rag_task(user_id: int):
    """Фоновая переиндексация RAG для пользователя (RQ worker)."""
    if settings.RAG_BACKEND != 'redis_vector':
        return

    from .indexing import sync_user_financial_chunks

    logger.info('RQ: syncing RAG for user %s', user_id)
    sync_user_financial_chunks(user_id)


def enqueue_user_rag_sync(user_id: int):
    """Поставить синхронизацию RAG в очередь Redis, не блокируя HTTP-запрос."""
    if settings.RAG_BACKEND != 'redis_vector':
        return

    try:
        import django_rq

        queue = django_rq.get_queue('rag')
        queue.enqueue(
            sync_user_rag_task,
            user_id,
            job_timeout=settings.RQ_RAG_JOB_TIMEOUT,
            result_ttl=300,
            failure_ttl=3600,
        )
    except Exception as exc:
        logger.error('RQ enqueue failed for user %s: %s', user_id, exc)
