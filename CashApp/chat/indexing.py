import logging
import re
from datetime import date, timedelta

from django.conf import settings
from django.utils import timezone

from finance.models import FinancialProduct, Operation, ProductType, UpcomingPayment

from .date_utils import operation_date_to_iso, parse_operation_date

logger = logging.getLogger(__name__)

CREDIT_PRODUCT_TYPES = {
    ProductType.CREDIT_CARD,
    ProductType.LOAN,
}

# Запросы о тратах — по умолчанию последние 30 дней
SPENDING_QUERY_HINTS = (
    'трат', 'расход', 'потрат', 'сколько', 'обычно', 'жрат', 'уходит', 'улетает',
    'трачу', 'расходую', 'покуп', 'оплат',
)

# Слова в запросе → ищем в категориях/сервисах операций
FOOD_QUERY_KEYWORDS = (
    'жрат', 'еда', 'еду', 'ест', 'продукт', 'кафе', 'ресторан', 'обед', 'ужин',
    'завтрак', 'питан', 'фастфуд', 'доставк', 'перекус', 'столов', 'бургер', 'пицц',
    'макдонald', 'kfc', 'суши', 'кофе', 'бар ',
)

CREDIT_QUERY_KEYWORDS = (
    'кредит', 'кредитк', 'долг', 'займ', 'ипотек', 'рассроч', 'долгов',
    'нагрузк', 'dbi', 'платеж по кредит', 'погаш', 'задолжен', 'процент по кредит',
)

# Подстроки в названиях категорий/сервисов из БД
FOOD_CATEGORY_HINTS = (
    'кафе', 'продукт', 'ресторан', 'еда', 'фастфуд', 'доставк', 'супермаркет',
    'перекрёсток', 'перекресток', 'ашан', 'пятёроч', 'пятероч', 'магнит', 'lavka',
    'кофе', 'food', 'coffee', 'grocery',
)

PERIOD_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r'(?:два|2)\s*года|за\s*2\s*год'), 'two_years'),
    (re.compile(r'пол(?:тора)?\s*года|1\.5\s*года'), 'eighteen_months'),
    (re.compile(r'полгода|6\s*месяцев?|шесть\s*месяцев?'), 'six_months'),
    (re.compile(r'в\s*этом\s*году|этот\s*год|текущ(?:ий|ем)\s*год'), 'calendar_year'),
    (re.compile(r'за\s*год|последн(?:ий|его|ем)\s*год(?![\w])'), 'year'),
    (re.compile(r'в\s*этом\s*месяце|этот\s*месяц|текущ(?:ий|ем)\s*месяц'), 'calendar_month'),
    (re.compile(r'за\s*месяц|последн(?:ий|его|ем)\s*месяц(?![\w])'), 'month'),
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


def _operation_metadata(operation: Operation) -> dict:
    is_credit_account = bool(
        operation.account and operation.account.product_type in CREDIT_PRODUCT_TYPES
    )
    return {
        'source': 'operation',
        'operation_id': operation.id,
        'operation_type': operation.operation_type,
        'operation_date': operation_date_to_iso(operation.operation_date),
        'category_name': operation.category.name if operation.category else '',
        'service_name': operation.service.name if operation.service else '',
        'note': (operation.note or '')[:120],
        'is_credit': is_credit_account,
    }


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
        parts.append(f'счёт «{account_name}» ({operation.account.get_bank_name_display()})')
    if operation.note:
        parts.append(f'описание: {operation.note[:120]}')
    return '. '.join(parts) + '.'


def is_spending_query(query: str) -> bool:
    q = query.lower()
    return any(hint in q for hint in SPENDING_QUERY_HINTS)


def is_food_query(query: str) -> bool:
    q = query.lower()
    return any(hint in q for hint in FOOD_QUERY_KEYWORDS)


def is_credit_query(query: str) -> bool:
    q = query.lower()
    return any(hint in q for hint in CREDIT_QUERY_KEYWORDS)


def build_dbi_chunk(user_id: int) -> dict | None:
    from analytics.services import get_dbi_for_user

    dbi = get_dbi_for_user(user_id)
    if dbi is None:
        return None

    text = (
        f'Кредитный индекс (долговая нагрузка) за {dbi.month:02d}.{dbi.year}: '
        f'{dbi.indicator_percent}% от месячного дохода. '
        f'Платежи по кредитам за месяц: {dbi.credit_payments} RUB. '
        f'Доход за месяц: {dbi.income_total} RUB. '
        f'Формула: платежи по кредитам / доход.'
    )
    return {
        'chunk_id': f'{user_id}:dbi:{dbi.id}',
        'text': text,
        'metadata': {
            'source': 'debt_burden_indicator',
            'dbi_id': dbi.id,
            'year': dbi.year,
            'month': dbi.month,
            'indicator': str(dbi.indicator),
            'is_credit': True,
        },
    }


def detect_query_period(query: str) -> tuple[date, date, str] | None:
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


def resolve_query_period(query: str) -> tuple[date, date, str] | None:
    """Явный период в запросе или последние 30 дней для вопросов о тратах."""
    explicit = detect_query_period(query)
    if explicit:
        return explicit
    if is_spending_query(query) or is_food_query(query):
        today = timezone.now().date()
        return today - timedelta(days=30), today, 'default_month'
    if is_credit_query(query):
        today = timezone.now().date()
        return date(today.year, today.month, 1), today, 'calendar_month'
    return None


def _operation_searchable_text(chunk: dict) -> str:
    metadata = chunk.get('metadata') or {}
    parts = [
        chunk.get('text', ''),
        metadata.get('category_name', ''),
        metadata.get('service_name', ''),
        metadata.get('note', ''),
    ]
    return ' '.join(parts).lower()


def _operation_matches_food_topic(chunk: dict) -> bool:
    searchable = _operation_searchable_text(chunk)
    return any(hint in searchable for hint in FOOD_CATEGORY_HINTS + FOOD_QUERY_KEYWORDS)


def _filter_operations_by_topic(chunks: list[dict], query: str) -> list[dict]:
    if is_credit_query(query):
        credit_ops = [c for c in chunks if c.get('metadata', {}).get('is_credit')]
        if credit_ops:
            return credit_ops
    if is_food_query(query):
        matched = [c for c in chunks if _operation_matches_food_topic(c)]
        if matched:
            return matched
    if is_spending_query(query):
        return [c for c in chunks if c.get('metadata', {}).get('operation_type') == 'expense']
    return chunks


def build_all_user_chunks(user_id: int) -> list[dict]:
    chunks = []

    for product in FinancialProduct.objects.filter(user_id=user_id):
        chunks.append(
            {
                'chunk_id': f'{user_id}:product:{product.id}',
                'text': _product_chunk_text(product),
                'metadata': {
                    'source': 'financial_product',
                    'product_id': product.id,
                    'product_type': product.product_type,
                    'is_credit': product.product_type in CREDIT_PRODUCT_TYPES,
                },
            }
        )

    payments = UpcomingPayment.objects.filter(user_id=user_id).select_related('service', 'account')
    for payment in payments:
        chunks.append(
            {
                'chunk_id': f'{user_id}:payment:{payment.id}',
                'text': _payment_chunk_text(payment),
                'metadata': {
                    'source': 'upcoming_payment',
                    'payment_id': payment.id,
                    'is_credit': False,
                },
            }
        )

    operations = (
        Operation.objects.filter(user_id=user_id)
        .select_related('category', 'service', 'account')
        .order_by('-operation_date', '-id')
    )
    for operation in operations:
        chunks.append(
            {
                'chunk_id': f'{user_id}:operation:{operation.id}',
                'text': _operation_chunk_text(operation),
                'metadata': _operation_metadata(operation),
            }
        )

    dbi_chunk = build_dbi_chunk(user_id)
    if dbi_chunk:
        chunks.append(dbi_chunk)

    return chunks


def _merge_chunks(*chunk_lists: list[dict]) -> list[dict]:
    merged = []
    seen = set()
    for chunk_list in chunk_lists:
        for chunk in chunk_list:
            chunk_id = chunk['chunk_id']
            if chunk_id in seen:
                continue
            seen.add(chunk_id)
            clean = {k: v for k, v in chunk.items() if k != 'embedding'}
            merged.append(clean)
    return merged


def _filter_operations_by_period(chunks: list[dict], date_from: date, date_to: date) -> list[dict]:
    result = []
    for chunk in chunks:
        if chunk.get('metadata', {}).get('source') != 'operation':
            continue
        op_date = parse_operation_date(chunk['metadata'].get('operation_date'))
        if not op_date:
            continue
        if date_from <= op_date <= date_to:
            result.append(chunk)
    return result


def get_relevant_operations(all_operations: list[dict], query: str, period: tuple[date, date, str] | None) -> list[dict]:
    ops = list(all_operations)
    if period:
        date_from, date_to, period_key = period
        ops = _filter_operations_by_period(ops, date_from, date_to)
        logger.info('Operations after period %s: %s', period_key, len(ops))

    ops = _filter_operations_by_topic(ops, query)

    if len(ops) > settings.RAG_MAX_OPERATIONS:
        ops = ops[: settings.RAG_MAX_OPERATIONS]

    return ops


def _db_fallback_chunks(user_id: int, query: str) -> list[dict]:
    chunks = build_all_user_chunks(user_id)
    if not chunks:
        return []

    period = resolve_query_period(query)
    products = [c for c in chunks if c['metadata']['source'] == 'financial_product']
    payments = [c for c in chunks if c['metadata']['source'] == 'upcoming_payment']
    operations = [c for c in chunks if c['metadata']['source'] == 'operation']
    operations = get_relevant_operations(operations, query, period)

    if is_spending_query(query) or is_food_query(query):
        return _merge_chunks(operations, products[:3])

    if is_credit_query(query):
        dbi_chunks = [c for c in chunks if c['metadata']['source'] == 'debt_burden_indicator']
        credit_products = [c for c in products if c['metadata'].get('is_credit')]
        return _merge_chunks(dbi_chunks, credit_products, operations, products[:2])

    return _merge_chunks(products, payments, operations)


def sync_user_financial_chunks(user_id: int):
    from .embeddings import encode_texts
    from .redis import (
        _index_needs_recreate,
        count_user_chunks,
        create_vector_index,
        delete_user_chunks,
        get_redis,
        store_chunks_batch,
    )

    create_vector_index(force=_index_needs_recreate())
    chunks = build_all_user_chunks(user_id)
    delete_user_chunks(user_id)

    if not chunks:
        logger.info('No financial data to index for user %s', user_id)
        get_redis().delete(f'rag_synced:{user_id}')
        return

    texts = [chunk['text'] for chunk in chunks]
    logger.info('Encoding %s chunks for user %s', len(texts), user_id)

    embeddings = encode_texts(texts, batch_size=settings.EMBEDDING_BATCH_SIZE)
    store_chunks_batch(user_id, chunks, embeddings)

    stored = count_user_chunks(user_id)
    redis_conn = get_redis()
    redis_conn.set(f'rag_synced:{user_id}', str(stored))
    redis_conn.set(f'rag_meta_version:{user_id}', str(settings.RAG_METADATA_VERSION))
    redis_conn.delete(f'rag_sync_queued:{user_id}')
    logger.info('RAG index synced for user %s (%s chunks in Redis)', user_id, stored)


def ensure_user_chunks(user_id: int) -> bool:
    """
    Проверить актуальность Redis-индекса.
    Если индекс устарел — ставит задачу в RQ и возвращает False (не блокирует HTTP).
    """
    from .redis import count_user_chunks, get_redis
    from .tasks import enqueue_user_rag_sync

    redis_conn = get_redis()
    synced_raw = redis_conn.get(f'rag_synced:{user_id}')
    synced_count = int(synced_raw) if synced_raw else 0
    actual_count = count_user_chunks(user_id)
    db_count = len(build_all_user_chunks(user_id))
    meta_version = redis_conn.get(f'rag_meta_version:{user_id}')
    expected_version = str(settings.RAG_METADATA_VERSION).encode()

    if (
        synced_count > 0
        and actual_count == synced_count
        and actual_count == db_count
        and meta_version == expected_version
    ):
        return True

    logger.info(
        'RAG resync queued for user %s: redis=%s synced=%s db=%s meta=%s',
        user_id,
        actual_count,
        synced_count,
        db_count,
        meta_version,
    )
    queue_key = f'rag_sync_queued:{user_id}'
    if redis_conn.set(queue_key, b'1', nx=True, ex=300):
        enqueue_user_rag_sync(user_id)
    return False


def retrieve_rag_context(user_id: int, query: str) -> list[dict]:
    from .redis import fetch_user_chunks_by_source, search_similar_chunks

    index_ready = ensure_user_chunks(user_id)
    if not index_ready:
        logger.info('RAG index not ready for user %s, using DB fallback', user_id)
        return _db_fallback_chunks(user_id, query)

    period = resolve_query_period(query)
    product_chunks = fetch_user_chunks_by_source(user_id, 'financial_product')
    payment_chunks = fetch_user_chunks_by_source(user_id, 'upcoming_payment')
    all_operations = fetch_user_chunks_by_source(user_id, 'operation')
    relevant_operations = get_relevant_operations(all_operations, query, period)
    vector_hits = search_similar_chunks(query, user_id=user_id, top_k=settings.RAG_TOP_K)

    if is_spending_query(query) or is_food_query(query):
        # Для вопросов о тратах — операции в приоритете, не все регулярные платежи
        merged = _merge_chunks(relevant_operations, vector_hits, product_chunks[:3])
    elif is_credit_query(query):
        dbi_chunks = fetch_user_chunks_by_source(user_id, 'debt_burden_indicator')
        if not dbi_chunks:
            from analytics.services import recalculate_dbi_for_user

            recalculate_dbi_for_user(user_id, sync_rag=False)
            dbi_chunk = build_dbi_chunk(user_id)
            dbi_chunks = [dbi_chunk] if dbi_chunk else []
        credit_products = [c for c in product_chunks if c.get('metadata', {}).get('is_credit')]
        merged = _merge_chunks(dbi_chunks, credit_products, relevant_operations, vector_hits)
    elif period:
        merged = _merge_chunks(product_chunks, payment_chunks, relevant_operations, vector_hits)
    else:
        merged = _merge_chunks(product_chunks, payment_chunks, vector_hits, relevant_operations[:settings.RAG_MAX_OPERATIONS])

    if not merged:
        logger.warning('Redis RAG empty for user %s, using DB fallback', user_id)
        merged = _db_fallback_chunks(user_id, query)

    logger.info(
        'RAG user %s: period=%s food=%s ops=%s vector=%s total=%s',
        user_id,
        period[2] if period else None,
        is_food_query(query),
        len(relevant_operations),
        len(vector_hits),
        len(merged),
    )
    return merged
