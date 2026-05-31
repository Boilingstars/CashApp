"""Сид платежей на кредитную карту за текущий месяц (~20 000 ₽)."""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.models import FinancialProduct, Operation, OperationType, ProductType

SEED_MARKER = '[cashapp-seed] Платёж по кредитной карте'
SEED_AMOUNTS = (Decimal('10500.00'), Decimal('9500.00'))
SEED_DAY_OFFSETS = (3, 12)


class Command(BaseCommand):
    help = 'Добавить тестовые перечисления на кредитную карту за текущий месяц (идемпотентно)'

    def handle(self, *args, **options):
        today = timezone.now().date()
        month_start = today.replace(day=1)
        created_total = 0

        credit_cards = FinancialProduct.objects.filter(
            product_type=ProductType.CREDIT_CARD,
        ).select_related('user')

        if not credit_cards.exists():
            self.stdout.write(self.style.WARNING('Кредитные карты в БД не найдены, сид пропущен'))
            return

        for card in credit_cards:
            if Operation.objects.filter(
                user=card.user,
                note__startswith=SEED_MARKER,
                operation_date__gte=month_start,
            ).exists():
                self.stdout.write(f'User {card.user_id}: сид уже есть, пропуск')
                continue

            for amount, offset in zip(SEED_AMOUNTS, SEED_DAY_OFFSETS, strict=True):
                op_date = month_start + timedelta(days=offset)
                if op_date > today:
                    op_date = today

                Operation.objects.create(
                    user=card.user,
                    account=card,
                    operation_type=OperationType.TRANSFER,
                    currency_code=card.currency_code or 'RUB',
                    amount=amount,
                    note=f'{SEED_MARKER} #{offset}',
                    operation_date=op_date,
                )
                created_total += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'User {card.user_id}: +{amount} RUB на карту {card.id} ({op_date})'
                    )
                )

        self.stdout.write(self.style.SUCCESS(f'Создано операций: {created_total}'))
