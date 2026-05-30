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
        parts.append(f'счёт «{account_name}» ({operation.account.get_bank_name_display()})')
    if operation.note:
        parts.append(f'описание: {operation.note[:120]}')
    return '. '.join(parts) + '.'


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


def build_all_user_chunks(user_id: int) -> list[dict]:
    """Собрать все записи пользователя для индексации в Redis."""
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
                'metadata': {
                    'source': 'operation',
                    'operation_id': operation.id,
                    'operation_type': operation.operation_type,
                    'operation_date': operation.operation_date.isoformat(),
                    'is_credit': False,
                },
            }
        )

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
            merged.append(chunk)
    return merged


def _filter_operations_by_period(chunks: list[dict], date_from: date, date_to: date) -> list[dict]:
    result = []
    for chunk in chunks:
        if chunk.get('metadata', {}).get('source') != 'operation':
            continue
        op_date_str = chunk['metadata'].get('operation_date')
        if not op_date_str:
            continue
        op_date = date.fromisoformat(op_date_str)
        if date_from <= op_date <= date_to:
            result.append(chunk)
    return result


def sync_user_financial_chunks(user_id: int):
    """Переиндексировать все записи пользователя: эмбеддинги + Redis."""
    from .embeddings import encode_texts
    from .redis import create_vector_index, delete_user_chunks, get_redis, store_chunks_batch

    create_vector_index()
    chunks = build_all_user_chunks(user_id)
    delete_user_chunks(user_id)

    if not chunks:
        logger.info('No financial data to index for user %s', user_id)
        return

    texts = [chunk['text'] for chunk in chunks]
    logger.info('Encoding %s chunks for user %s', len(texts), user_id)

    embeddings = encode_texts(texts, batch_size=settings.EMBEDDING_BATCH_SIZE)
    store_chunks_batch(user_id, chunks, embeddings)

    get_redis().set(f'rag_synced:{user_id}', str(len(chunks)))
    logger.info('RAG index synced for user %s (%s chunks)', user_id, len(chunks))


def ensure_user_chunks(user_id: int):
    from .redis import get_redis, user_has_chunks

    if user_has_chunks(user_id) and get_redis().get(f'rag_synced:{user_id}'):
        return
    sync_user_financial_chunks(user_id)


def retrieve_rag_context(user_id: int, query: str) -> list[dict]:
    """
    1. Синхронизировать все записи пользователя в Redis (если ещё нет).
    2. Закодировать запрос той же моделью.
    3. KNN-поиск в Redis по user_id.
    4. При указании периода — добавить все операции за интервал.
    """
    from .redis import fetch_user_chunks_by_source, search_similar_chunks

    ensure_user_chunks(user_id)

    period = detect_query_period(query)
    product_chunks = fetch_user_chunks_by_source(user_id, 'financial_product')
    payment_chunks = fetch_user_chunks_by_source(user_id, 'upcoming_payment')
    vector_hits = search_similar_chunks(query, user_id=user_id, top_k=settings.RAG_TOP_K)

    if period:
        date_from, date_to, period_key = period
        all_operations = fetch_user_chunks_by_source(user_id, 'operation')
        period_operations = _filter_operations_by_period(all_operations, date_from, date_to)
        logger.info(
            'RAG period=%s for user %s: %s operations in range',
            period_key,
            user_id,
            len(period_operations),
        )
        return _merge_chunks(product_chunks, payment_chunks, period_operations, vector_hits)

    return _merge_chunks(product_chunks, payment_chunks, vector_hits)
