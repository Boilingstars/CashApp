import logging
import re
from datetime import date, timedelta

from django.conf import settings
from django.utils import timezone

from finance.models import FinancialProduct, Operation, ProductType, UpcomingPayment

logger = logging.getLogger(__name__)

CREDIT_PRODUCT_TYPES = {
    ProductType.CREDIT_CARD,
    ProductType.LOAN,
}

CREDIT_QUERY_HINTS = (
    'кредит', 'займ', 'loan', 'долг', 'ипотек', 'заём', 'заем', 'рассроч', 'macbook', 'макбук',
)
PAYMENT_QUERY_HINTS = ('платёж', 'платеж', 'ежемесяч', 'подписк', 'оплат', 'списан')
OPERATION_QUERY_HINTS = (
    'операц', 'трат', 'расход', 'доход', 'перевод', 'покуп', 'истори', ' транзак',
    'потрат', 'заработ', 'получил', 'потрати',
)

# Порядок важен: более длинные периоды проверяются первыми.
PERIOD_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r'(?:два|2)\s*года|за\s*2\s*год'), 'two_years'),
    (re.compile(r'пол(?:тора)?\s*года|1\.5\s*года'), 'eighteen_months'),
    (re.compile(r'полгода|6\s*месяцев?|шесть\s*месяцев?'), 'six_months'),
    (re.compile(r'в\s*этом\s*году|этот\s*год|текущ(?:ий|ем)\s*год'), 'calendar_year'),
    (re.compile(r'за\s*год|последн(?:ий|его|ем)\s*год|(?<![\w])год(?![\w])'), 'year'),
    (re.compile(r'в\s*этом\s*месяце|этот\s*месяц|текущ(?:ий|ем)\s*месяц'), 'calendar_month'),
    (re.compile(r'за\s*месяц|последн(?:ий|его|ем)\s*месяц|(?<![\w])месяц(?![\w])'), 'month'),
)


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


def _operation_chunk_text(operation: Operation) -> str:
    type_label = operation.get_operation_type_display()
    parts = [
        f'Операция: {type_label} {operation.amount} {operation.currency_code} '
        f'от {operation.operation_date.strftime("%d.%m.%Y")}',
    ]
    if operation.category:
        parts.append(f'категория «{operation.category.name}»')
    if operation.service:
        parts.append(f'сервис «{operation.service.name}»')
    if operation.account:
        account_name = operation.account.custom_name or operation.account.get_product_type_display()
        parts.append(
            f'счёт «{account_name}» ({operation.account.get_bank_name_display()})'
        )
    if operation.note:
        parts.append(f'описание: {operation.note[:120]}')
    return '. '.join(parts) + '.'


def _query_words(query: str) -> set[str]:
    return {word for word in re.findall(r'[\wёа-я]+', query.lower()) if len(word) > 2}


def detect_query_period(query: str) -> tuple[date, date, str] | None:
    """Определить временной промежуток из текста запроса пользователя."""
    query_lower = query.lower()
    today = timezone.now().date()

    for pattern, period_key in PERIOD_RULES:
        if not pattern.search(query_lower):
            continue

        if period_key == 'two_years':
            return today - timedelta(days=730), today, period_key
        if period_key == 'eighteen_months':
            return today - timedelta(days=548), today, period_key
        if period_key == 'six_months':
            return today - timedelta(days=183), today, period_key
        if period_key == 'calendar_year':
            return date(today.year, 1, 1), today, period_key
        if period_key == 'year':
            return today - timedelta(days=365), today, period_key
        if period_key == 'calendar_month':
            return date(today.year, today.month, 1), today, period_key
        if period_key == 'month':
            return today - timedelta(days=30), today, period_key

    return None


def _score_chunk(chunk: dict, query_lower: str, words: set[str]) -> float:
    text_lower = chunk['text'].lower()
    score = float(sum(1 for word in words if word in text_lower))

    metadata = chunk.get('metadata') or {}
    source = metadata.get('source')

    if metadata.get('is_credit') and any(hint in query_lower for hint in CREDIT_QUERY_HINTS):
        score += 10
    if source == 'upcoming_payment' and any(hint in query_lower for hint in PAYMENT_QUERY_HINTS):
        score += 5
    if source == 'operation' and any(hint in query_lower for hint in OPERATION_QUERY_HINTS):
        score += 5
    if metadata.get('is_credit'):
        score += 1

    return score


def _with_scores(chunks: list[dict], query: str) -> list[dict]:
    query_lower = query.lower()
    words = _query_words(query)
    return [{**chunk, 'score': _score_chunk(chunk, query_lower, words)} for chunk in chunks]


def get_static_chunks(user_id: int) -> list[dict]:
    """Счета, карты, кредиты и предстоящие платежи — всегда полностью."""
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


def get_operation_chunks(user_id: int, query: str) -> list[dict]:
    """
    История операций.
    Без периода в запросе — максимум RAG_MAX_OPERATIONS (по умолчанию 21), самые релевантные/свежие.
    С периодом (месяц, год, два года…) — все операции за этот интервал.
    """
    period = detect_query_period(query)
    max_operations = settings.RAG_MAX_OPERATIONS

    qs = (
        Operation.objects.filter(user_id=user_id)
        .select_related('category', 'service', 'account')
        .order_by('-operation_date', '-id')
    )

    if period:
        date_from, date_to, period_key = period
        qs = qs.filter(operation_date__gte=date_from, operation_date__lte=date_to)
        logger.info(
            'RAG operations for user %s: period=%s (%s — %s), no limit',
            user_id,
            period_key,
            date_from,
            date_to,
        )
    else:
        qs = qs[: max(max_operations * 3, max_operations)]

    operations = list(qs)
    if not operations:
        return []

    chunks = [
        {
            'chunk_id': f'db:operation:{operation.id}',
            'text': _operation_chunk_text(operation),
            'metadata': {
                'source': 'operation',
                'operation_id': operation.id,
                'operation_type': operation.operation_type,
                'operation_date': operation.operation_date.isoformat(),
                'is_credit': False,
            },
            'score': 0.0,
        }
        for operation in operations
    ]

    if period:
        return _with_scores(chunks, query)

    if len(chunks) <= max_operations:
        return _with_scores(chunks, query)

    ranked = sorted(
        _with_scores(chunks, query),
        key=lambda chunk: (chunk['score'], chunk['metadata']['operation_date']),
        reverse=True,
    )
    return ranked[:max_operations]


def get_financial_chunks_from_db(user_id: int, query: str = '') -> list[dict]:
    """Собрать полный финансовый контекст пользователя из PostgreSQL."""
    return get_static_chunks(user_id) + get_operation_chunks(user_id, query)


def rank_chunks_for_query(chunks: list[dict], query: str, top_k: int | None = None) -> list[dict]:
    """Ранжирование, если общий контекст превышает лимит (редкий случай)."""
    top_k = top_k or settings.RAG_TOP_K
    if not chunks:
        return []

    scored = _with_scores(chunks, query)
    ranked = sorted(scored, key=lambda chunk: chunk['score'], reverse=True)
    return ranked[:top_k]


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

    chunks = get_financial_chunks_from_db(user_id, query)
    if not chunks:
        return []

    period = detect_query_period(query)
    if period or len(chunks) <= settings.RAG_TOP_K:
        return _with_scores(chunks, query)

    return rank_chunks_for_query(chunks, query)


def sync_user_financial_chunks(user_id: int):
    """Индексация в Redis — только при RAG_BACKEND=redis_vector."""
    if settings.RAG_BACKEND != 'redis_vector':
        return

    from .redis import create_vector_index, delete_user_chunks, get_redis, store_chunk

    create_vector_index()
    delete_user_chunks(user_id)

    indexed = 0

    def _index_chunk(chunk_id: str, text: str, metadata: dict):
        nonlocal indexed
        try:
            store_chunk(chunk_id, user_id, text, metadata)
            indexed += 1
        except Exception as exc:
            logger.error('Failed to index chunk %s: %s', chunk_id, exc)

    for product in FinancialProduct.objects.filter(user_id=user_id):
        _index_chunk(
            f'{user_id}:product:{product.id}',
            _product_chunk_text(product),
            {
                'source': 'financial_product',
                'product_id': product.id,
                'product_type': product.product_type,
                'is_credit': product.product_type in CREDIT_PRODUCT_TYPES,
            },
        )

    for payment in UpcomingPayment.objects.filter(user_id=user_id).select_related('service', 'account'):
        _index_chunk(
            f'{user_id}:payment:{payment.id}',
            _payment_chunk_text(payment),
            {'source': 'upcoming_payment', 'payment_id': payment.id},
        )

    for operation in (
        Operation.objects.filter(user_id=user_id)
        .select_related('category', 'service', 'account')
        .order_by('-operation_date')[: settings.RAG_MAX_OPERATIONS]
    ):
        _index_chunk(
            f'{user_id}:operation:{operation.id}',
            _operation_chunk_text(operation),
            {
                'source': 'operation',
                'operation_id': operation.id,
                'operation_type': operation.operation_type,
            },
        )

    if indexed:
        get_redis().set(f'rag_synced:{user_id}', '1')
        logger.info('RAG vector index synced for user %s (%s chunks)', user_id, indexed)
    else:
        get_redis().delete(f'rag_synced:{user_id}')


def ensure_user_chunks(user_id: int):
    if settings.RAG_BACKEND != 'redis_vector':
        return
    sync_user_financial_chunks(user_id)
