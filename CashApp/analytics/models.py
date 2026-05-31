from decimal import Decimal

from django.conf import settings
from django.db import models


class NotesForDBI(models.TextChoices):
    DEFAULT = 'default', 'Рассчитан по операциям за месяц'
    NO_INCOME = 'no_income', 'Нет дохода за месяц'
    NO_CREDIT_PAYMENTS = 'no_credit_payments', 'Нет платежей по кредитам за месяц'


class DebtBurdenIndicator(models.Model):
    """
    Кредитный индекс (долговая нагрузка) за календарный месяц:
    сумма платежей по кредитам / сумма доходов.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='debt_burden_indicators',
    )
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    credit_payments = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Платежи по кредитам за месяц',
    )
    income_total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Доход за месяц',
    )
    indicator = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=Decimal('0'),
        help_text='Отношение credit_payments / income_total (0.25 = 25%)',
    )
    note = models.CharField(
        max_length=32,
        choices=NotesForDBI.choices,
        default=NotesForDBI.DEFAULT,
    )
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'year', 'month'],
                name='unique_dbi_per_user_month',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'year', 'month']),
        ]
        ordering = ['-year', '-month']

    def __str__(self):
        return f'DBI {self.user_id} {self.year}-{self.month:02d}: {self.indicator}'

    @property
    def indicator_percent(self) -> Decimal:
        return (self.indicator * Decimal('100')).quantize(Decimal('0.01'))
