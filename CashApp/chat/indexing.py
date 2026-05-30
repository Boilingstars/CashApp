import logging

from django.conf import settings

from finance.models import FinancialProduct, ProductType, UpcomingPayment

from .redis import create_vector_index, delete_user_chunks, get_redis, store_chunk

logger = logging.getLogger(__name__)

CREDIT_PRODUCT_TYPES = {
    ProductType.CREDIT_CARD,
    ProductType.LOAN,
}


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


def sync_user_financial_chunks(user_id: int):
    """Переиндексировать финансовые данные пользователя в Redis."""
    create_vector_index()
    delete_user_chunks(user_id)

    products = FinancialProduct.objects.filter(user_id=user_id)
    for product in products:
        chunk_id = f'{user_id}:product:{product.id}'
        metadata = {
            'source': 'financial_product',
            'product_id': product.id,
            'product_type': product.product_type,
            'is_credit': product.product_type in CREDIT_PRODUCT_TYPES,
        }
        try:
            store_chunk(chunk_id, user_id, _product_chunk_text(product), metadata)
        except Exception as exc:
            logger.error('Failed to index product %s: %s', product.id, exc)

    payments = UpcomingPayment.objects.filter(user_id=user_id).select_related('service', 'account')
    for payment in payments:
        chunk_id = f'{user_id}:payment:{payment.id}'
        metadata = {
            'source': 'upcoming_payment',
            'payment_id': payment.id,
        }
        try:
            store_chunk(chunk_id, user_id, _payment_chunk_text(payment), metadata)
        except Exception as exc:
            logger.error('Failed to index payment %s: %s', payment.id, exc)

    get_redis().set(f'rag_synced:{user_id}', '1')
    logger.info('RAG index synced for user %s', user_id)


def ensure_user_chunks(user_id: int):
    """Синхронизировать чанки, если пользователь ещё не проиндексирован."""
    redis_conn = get_redis()
    if redis_conn.get(f'rag_synced:{user_id}'):
        return
    sync_user_financial_chunks(user_id)
