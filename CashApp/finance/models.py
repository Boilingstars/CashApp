from django.db import models
from django.conf import settings


class ProductType(models.TextChoices):
    DEBIT_CARD = 'debit_card', 'Дебетовая карта'
    CREDIT_CARD = 'credit_card', 'Кредитная карта'
    DEPOSIT = 'deposit', 'Вклад'
    SAVINGS_ACCOUNT = 'savings_account', 'Накопительный счёт'
    BROKERAGE_ACCOUNT = 'brokerage_account', 'Брокерский счёт'
    IIS = 'iis', 'ИИС'
    INVESTMENT_PIGGY_BANK = 'investment_piggy_bank', 'Инвесткопилка'
    METAL_ACCOUNT = 'metal_account', 'Металлический счёт'
    LOAN = 'loan', 'Кредит/займ'


class Bank(models.TextChoices):
    SBER = 'sber', 'Сбербанк'
    VTB = 'vtb', 'ВТБ'
    ALFA = 'alfa', 'Альфа-Банк'
    T_BANK = 't_bank', 'Т-Банк'
    GAZPROM = 'gazprom', 'Газпромбанк'
    RSHB = 'rshb', 'Россельхозбанк'
    SOVCOM = 'sovcom', 'Совкомбанк'
    PSB = 'psb', 'ПСБ'
    YANDEX = 'yandex', 'Яндекс'
    OZON = 'ozon', 'Ozon'
    WILDBERRIES = 'wildberries', 'Wildberries'
    OTHER = 'other', 'Другой'


class Currency(models.TextChoices):
    RUB = 'RUB', 'Российский рубль'
    USD = 'USD', 'Доллар США'
    EUR = 'EUR', 'Евро'
    GBP = 'GBP', 'Фунт стерлингов'
    CHF = 'CHF', 'Швейцарский франк'
    JPY = 'JPY', 'Японская иена'
    CNY = 'CNY', 'Китайский юань'
    KZT = 'KZT', 'Тенге'
    BYN = 'BYN', 'Белорусский рубль'
    INR = 'INR', 'Индийская рупия'
    AED = 'AED', 'Дирхам ОАЭ'
    SGD = 'SGD', 'Сингапурский доллар'
    OTHER = 'other', 'Другая'


class OperationType(models.TextChoices):
    EXPENSE = 'expense', 'Расход'
    INCOME = 'income', 'Доход'
    TRANSFER = 'transfer', 'Перевод'


class Service(models.Model):
    name = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='custom_services'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'user']

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='custom_categories'
    )
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'user']
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class FinancialProduct(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='financial_products'
    )
    product_type = models.CharField(
        max_length=30,
        choices=ProductType.choices,
        default=ProductType.DEBIT_CARD
    )
    bank_name = models.CharField(
        max_length=30,
        choices=Bank.choices,
        default=Bank.OTHER
    )
    serial_number = models.CharField(
        max_length=4,
        unique=True,
        verbose_name="Последние 4 цифры / код продукта",
        blank=True, null=True
    )
    currency_code = models.CharField(
        max_length=10,
        choices=Currency.choices,
        default=Currency.RUB
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.0
    )
    custom_name = models.CharField(
        max_length=24,
        blank=True,
        verbose_name="Произвольное наименование"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'product_type']),
            models.Index(fields=['bank_name']),
        ]

    def __str__(self):
        return f"{self.get_product_type_display()} - {self.get_bank_name_display()}"


class UpcomingPayment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='upcoming_payments'
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    account = models.ForeignKey(
        FinancialProduct,
        on_delete=models.PROTECT,
        blank=True, null=True
    )
    currency_code = models.CharField(
        max_length=10,
        choices=Currency.choices,
        default=Currency.RUB
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.0
    )
    custom_name = models.CharField(
        max_length=24,
        blank=True,
        verbose_name="Произвольное наименование"
    )
    payment_interval_months = models.PositiveSmallIntegerField(
        default=1
    )
    payment_day = models.PositiveSmallIntegerField(
        default=1
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', 'payment_day']),
            models.Index(fields=['service']),
        ]

    def __str__(self):
        return f"{self.custom_name or self.service.name} - {self.amount} {self.get_currency_code_display()}"


class Operation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='operations'
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name='operations',
        null=True, blank=True
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='operations',
        null=True, blank=True
    )
    account = models.ForeignKey(
        FinancialProduct,
        on_delete=models.PROTECT,
        blank=True, null=True
    )
    operation_type = models.CharField(
        max_length=10,
        choices=OperationType.choices,
        default=OperationType.EXPENSE
    )
    currency_code = models.CharField(
        max_length=10,
        choices=Currency.choices,
        default=Currency.RUB
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2
    )
    note = models.TextField(
        blank=True,
        verbose_name="Описание"
    )
    operation_date = models.DateField(
        db_index=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )
    operation_time = models.TimeField(
        blank=True, null=True
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', 'operation_date']),
            models.Index(fields=['operation_type']),
        ]

    def __str__(self):
        return f"{self.get_operation_type_display()}: {self.amount} {self.currency_code} - {self.note[:20]}"

class Tag(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tags'
    )
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'name']

    def __str__(self):
        return self.name

class OperationTag(models.Model):
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE, related_name='operation_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='operation_tags')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['operation', 'tag']