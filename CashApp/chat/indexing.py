import logging
import re

from django.conf import settings

from finance.models import FinancialProduct, ProductType, UpcomingPayment

logger = logging.getLogger(__name__)

CREDIT_PRODUCT_TYPES = {
    ProductType.CREDIT_CARD,
    ProductType.LOAN,
}

CREDIT_QUERY_HINTS = (
    'кредит', 'займ', 'loan', 'долг', 'ипотек', 'заём', 'заем', 'рассроч', 'macbook', 'макбук',
)
PAYMENT_QUERY_HINTS = ('платёж', 'платеж', 'ежемесяч', 'подписк', 'оплат', 'списан')


def _product_chunk_text(product: FinancialProduct) -> str:
    type_label = product.get_product_type_display()
    bank = product.get_bank_name_display()
    name = product.custom_name or type_label
    return (
        f'{type_label} «{name}» в {bank}. '
        f'Сумма/остаток: {product.amount} {product.currency_code}.'
    )


def _payment_chunk_text(payment: UpcomingPayment) -> str:
    service_name = payment.custom_name or payment.service.name
    account_info = ''
    if payment.account:
        account_info = (
            f' Списание с: {payment.account.get_product_type_display()} '
            f'({payment.account.get_bank_name_display()}).'
        )
    return (
        f'Регулярный платёж «{service_name}»: {payment.amount} {payment.currency_code}, '
        f'каждые {payment.payment_interval_months} мес., день платежа {payment.payment_day}.'
        f'{account_info}'
    )


def _query_words(query: str) -> set[str]:
    return {word for word in re.findall(r'[\wёа-я]+', query.lower()) if len(word) > 2}


def _score_chunk(chunk: dict, query_lower: str, words: set[str]) -> float:
    text_lower = chunk['text'].lower()
    score = float(sum(1 for word in words if word in text_lower))

    metadata = chunk.get('metadata') or {}
    if metadata.get('is_credit') and any(hint in query_lower for hint in CREDIT_QUERY_HINTS):
        score += 10
    if metadata.get('source') == 'upcoming_payment' and any(hint in query_lower for hint in PAYMENT_QUERY_HINTS):
        score += 5
    if metadata.get('is_credit'):
        score += 1

    return score


def get_financial_chunks_from_db(user_id: int) -> list[dict]:
    """Собрать финансовый контекст пользователя напрямую из PostgreSQL."""
    chunks = []

    for product in FinancialProduct.objects.filter(user_id=user_id):
        chunks.append(
            {
                'chunk_id': f'db:product:{product.id}',
                'text': _product_chunk_text(product),
                'metadata': {
                    'source': 'financial_product',
                    'product_id': product.id,
                    'product_type': product.product_type,
                    'is_credit': product.product_type in CREDIT_PRODUCT_TYPES,
                },
                'score': 0.0,
            }
        )

    payments = UpcomingPayment.objects.filter(user_id=user_id).select_related('service', 'account')
    for payment in payments:
        chunks.append(
            {
                'chunk_id': f'db:payment:{payment.id}',
                'text': _payment_chunk_text(payment),
                'metadata': {
                    'source': 'upcoming_payment',
                    'payment_id': payment.id,
                    'is_credit': False,
                },
                'score': 0.0,
            }
        )

    return chunks


def rank_chunks_for_query(chunks: list[dict], query: str, top_k: int | None = None) -> list[dict]:
    """Простое ранжирование по ключевым словам без API эмбеддингов."""
    top_k = top_k or settings.RAG_TOP_K
    if not chunks:
        return []

    query_lower = query.lower()
    words = _query_words(query)

    ranked = sorted(
        chunks,
        key=lambda chunk: _score_chunk(chunk, query_lower, words),
        reverse=True,
    )

    if len(ranked) <= top_k:
        return [{**chunk, 'score': _score_chunk(chunk, query_lower, words)} for chunk in ranked]

    top = [{**chunk, 'score': _score_chunk(chunk, query_lower, words)} for chunk in ranked[:top_k]]
    if any(chunk['score'] > 0 for chunk in top):
        return top

    return [{**chunk, 'score': 0.0} for chunk in ranked[:top_k]]


def retrieve_rag_context(user_id: int, query: str) -> list[dict]:
    """
    Получить RAG-контекст для запроса.
    По умолчанию — из БД (без эмбеддингов). Redis vector search — опционально.
    """
    if settings.RAG_BACKEND == 'redis_vector':
        from .redis import search_similar_chunks

        try:
            sync_user_financial_chunks(user_id)
            vector_chunks = search_similar_chunks(query, user_id=user_id)
            if vector_chunks:
                return vector_chunks
        except Exception as exc:
            logger.warning('Vector RAG unavailable for user %s: %s', user_id, exc)

    db_chunks = get_financial_chunks_from_db(user_id)
    if not db_chunks:
        return []

    if len(db_chunks) <= settings.RAG_TOP_K:
        query_lower = query.lower()
        words = _query_words(query)
        return [{**chunk, 'score': _score_chunk(chunk, query_lower, words)} for chunk in db_chunks]

    return rank_chunks_for_query(db_chunks, query)


def sync_user_financial_chunks(user_id: int):
    """Индексация в Redis — только при RAG_BACKEND=redis_vector."""
    if settings.RAG_BACKEND != 'redis_vector':
        return

    from .redis import create_vector_index, delete_user_chunks, get_redis, store_chunk

    create_vector_index()
    delete_user_chunks(user_id)

    indexed = 0
    for product in FinancialProduct.objects.filter(user_id=user_id):
        chunk_id = f'{user_id}:product:{product.id}'
        metadata = {
            'source': 'financial_product',
            'product_id': product.id,
            'product_type': product.product_type,
            'is_credit': product.product_type in CREDIT_PRODUCT_TYPES,
        }
        try:
            store_chunk(chunk_id, user_id, _product_chunk_text(product), metadata)
            indexed += 1
        except Exception as exc:
            logger.error('Failed to index product %s: %s', product.id, exc)

    payments = UpcomingPayment.objects.filter(user_id=user_id).select_related('service', 'account')
    for payment in payments:
        chunk_id = f'{user_id}:payment:{payment.id}'
        metadata = {'source': 'upcoming_payment', 'payment_id': payment.id}
        try:
            store_chunk(chunk_id, user_id, _payment_chunk_text(payment), metadata)
            indexed += 1
        except Exception as exc:
            logger.error('Failed to index payment %s: %s', payment.id, exc)

    if indexed:
        get_redis().set(f'rag_synced:{user_id}', '1')
        logger.info('RAG vector index synced for user %s (%s chunks)', user_id, indexed)
    else:
        get_redis().delete(f'rag_synced:{user_id}')


def ensure_user_chunks(user_id: int):
    if settings.RAG_BACKEND != 'redis_vector':
        return
    sync_user_financial_chunks(user_id)
