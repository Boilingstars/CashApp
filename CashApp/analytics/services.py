import logging
from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone

from finance.models import Operation, OperationType, ProductType

from .models import DebtBurdenIndicator, NotesForDBI

logger = logging.getLogger(__name__)
User = get_user_model()

CREDIT_PRODUCT_TYPES = (ProductType.CREDIT_CARD, ProductType.LOAN)
CREDIT_PAYMENT_OPERATION_TYPES = (OperationType.TRANSFER, OperationType.EXPENSE)


def calendar_month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def credit_payment_operations(user, date_from: date, date_to: date):
    return (
        Operation.objects.filter(
            user=user,
            operation_date__gte=date_from,
            operation_date__lte=date_to,
            account__product_type__in=CREDIT_PRODUCT_TYPES,
            operation_type__in=CREDIT_PAYMENT_OPERATION_TYPES,
        )
        .select_related('account', 'category', 'service')
        .order_by('-operation_date', '-id')
    )


def income_operations(user, date_from: date, date_to: date):
    return (
        Operation.objects.filter(
            user=user,
            operation_date__gte=date_from,
            operation_date__lte=date_to,
            operation_type=OperationType.INCOME,
        )
        .select_related('account', 'category', 'service')
        .order_by('-operation_date', '-id')
    )


def sum_operations_amount(queryset) -> Decimal:
    total = queryset.aggregate(total=Sum('amount'))['total']
    return total if total is not None else Decimal('0')


def recalculate_dbi_for_user(
    user_id: int,
    year: int | None = None,
    month: int | None = None,
    *,
    sync_rag: bool = True,
) -> DebtBurdenIndicator:
    today = timezone.now().date()
    year = year or today.year
    month = month or today.month
    date_from, date_to = calendar_month_bounds(year, month)

    user = User.objects.get(pk=user_id)
    credit_qs = credit_payment_operations(user, date_from, date_to)
    income_qs = income_operations(user, date_from, date_to)

    credit_total = sum_operations_amount(credit_qs)
    income_total = sum_operations_amount(income_qs)

    if income_total > 0:
        indicator = (credit_total / income_total).quantize(Decimal('0.0001'))
        note = NotesForDBI.DEFAULT
    elif credit_total > 0:
        indicator = Decimal('1')
        note = NotesForDBI.NO_INCOME
    else:
        indicator = Decimal('0')
        note = NotesForDBI.NO_CREDIT_PAYMENTS

    dbi, _ = DebtBurdenIndicator.objects.update_or_create(
        user=user,
        year=year,
        month=month,
        defaults={
            'credit_payments': credit_total,
            'income_total': income_total,
            'indicator': indicator,
            'note': note,
        },
    )

    logger.info(
        'DBI user %s %s-%02d: credit=%s income=%s indicator=%s',
        user_id,
        year,
        month,
        credit_total,
        income_total,
        indicator,
    )

    if sync_rag:
        try:
            from chat.tasks import enqueue_user_rag_sync

            enqueue_user_rag_sync(user_id)
        except Exception as exc:
            logger.warning('RAG enqueue after DBI failed for user %s: %s', user_id, exc)

    return dbi


def get_dbi_for_user(
    user_id: int,
    year: int | None = None,
    month: int | None = None,
) -> DebtBurdenIndicator | None:
    today = timezone.now().date()
    year = year or today.year
    month = month or today.month
    return DebtBurdenIndicator.objects.filter(
        user_id=user_id,
        year=year,
        month=month,
    ).first()
