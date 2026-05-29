import random
from datetime import timedelta, date, time
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection
from django.db.models import Sum, Q
from django.utils import timezone
from faker import Faker
from finance.models import (
    Category, Service, Operation, OperationType,
    FinancialProduct, UpcomingPayment,
    ProductType, Bank, Currency,
)
from finance.factories import FinancialProductFactory, UpcomingPaymentFactory

User = get_user_model()
fake = Faker('ru_RU')

income_cats = 'Зарплата, Подработка, Кэшбэк, Подарки, Дивиденды'
outcome_cats = 'Жильё, Продукты, Транспорт, Связь, Медицина, Кафе, Развлечения, Шопинг, Красота и здоровье, Образование, Подарки, Дети, Домашние животные, Непредвиденные'

cats_and_services = {
    'Продукты': ['Перекрёсток', 'Ашан'],
    'Транспорт': ['Лукойл', 'Яндекс.Такси'],
    'Связь': ['МТС'],
    'Медицина': ['Аптека «Апрель»'],
    'Кафе': ['Кофе Хауз', 'Хлебница'],
    'Развлечения': ['Okko'],
    'Шопинг': ['Wildberries', 'Ozon'],
    'Красота и здоровье': ['Золотое Яблоко'],
    'Образование': ['Skillbox'],
    'Домашние животные': ['Четыре Лапы'],
    'Дети': ['Детский Мир'],
    'Подарки': ['Flowwow'],
    'Непредвиденные': ['Штрафы ГИБДД']
}

def clamp(value, min_val, max_val):
    return max(min_val, min(value, max_val))

def gauss_amount(currency):
    if currency == 'RUB':
        mu, sigma = 2500, 1500
        min_val, max_val = 50, 40000
    elif currency == 'CNY':
        mu, sigma = 50, 20
        min_val, max_val = 1, 150
    else:  # USD
        mu, sigma = 30, 10
        min_val, max_val = 0.5, 100
    raw = random.gauss(mu, sigma)
    return round(clamp(raw, min_val, max_val), 2)

def random_currency():
    r = random.random()
    if r < 0.85:
        return 'RUB'
    elif r < 0.95:
        return 'CNY'
    else:
        return 'USD'

def random_time_in_range(start_hour, end_hour):
    h = random.randint(start_hour, end_hour - 1)
    m = random.randint(0, 59)
    s = random.randint(0, 59)
    return time(hour=h, minute=m, second=s)

def random_datetime_between(start_date, end_date, allowed_hours=None):
    d = fake.date_between(start_date=start_date, end_date=end_date)
    if allowed_hours:
        t = random_time_in_range(*allowed_hours)
    else:
        t = fake.time_object()
    return d, t

def reset_sequences():
    db_engine = connection.vendor
    tables = [
        'finance_category',
        'finance_service',
        'finance_financialproduct',
        'finance_upcomingpayment',
        'finance_operation',
    ]
    with connection.cursor() as cursor:
        for table in tables:
            if db_engine == 'postgresql':
                cursor.execute(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1;")
            elif db_engine == 'sqlite':
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name = '{table}';")

# Временные окна для категорий
category_time_windows = {
    'Продукты': [(9, 21), (9, 21)],
    'Транспорт': [(7, 23), (7, 23)],
    'Связь': [(9, 21), (9, 21)],
    'Медицина': [(9, 18), (9, 18)],
    'Кафе': [(8, 11), (12, 15), (18, 22)],
    'Развлечения': [(17, 23), (17, 23), (0, 3)],
    'Шопинг': [(10, 22), (10, 22)],
    'Красота и здоровье': [(10, 20), (10, 20)],
    'Образование': [(9, 21), (9, 21)],
    'Домашние животные': [(9, 21), (9, 21)],
    'Дети': [(9, 21), (9, 21)],
    'Непредвиденные': [(0, 23)],
    'Подарки': [(10, 22)],
    'Жильё': [(9, 18)],
}
income_time_windows = {
    'Зарплата': [(9, 11)],
    'Подработка': [(9, 18)],
    'Кэшбэк': [(0, 23)],
    'Подарки': [(10, 22)],
    'Дивиденды': [(9, 18)],
}

def get_time_window_for_category(cat_name, is_income=False):
    windows = income_time_windows if is_income else category_time_windows
    if cat_name in windows:
        return random.choice(windows[cat_name])
    return None

class Command(BaseCommand):
    help = 'Заполняет БД демо-данными с реалистичными финансами'

    def add_arguments(self, parser):
        parser.add_argument('--products', type=int, default=15,
                            help='Количество случайных финансовых продуктов (дополнительно к обязательным)')
        parser.add_argument('--payments', type=int, default=10)
        parser.add_argument('--operations', type=int, default=225)

    def handle(self, *args, **options):
        # 0. Очистка старых данных
        self.stdout.write('Очистка старых данных...')
        UpcomingPayment.objects.all().delete()
        Operation.objects.all().delete()
        FinancialProduct.objects.all().delete()
        Service.objects.all().delete()
        Category.objects.all().delete()
        reset_sequences()
        self.stdout.write('Старые данные удалены, последовательности сброшены')

        # 1. Пользователь
        try:
            demo_user = User.objects.get(username='albert')
        except User.DoesNotExist:
            try:
                demo_user = User.objects.create_user(
                    username='demo_user',
                    email='demo@example.com',
                    password='demo'
                )
            except IntegrityError:
                demo_user = User.objects.get(username='demo_user')
        self.stdout.write(f'Пользователь: {demo_user.username}')

        # 2. Категории
        all_categories = [cat.strip() for cat in (income_cats + ', ' + outcome_cats).split(',') if cat.strip()]
        category_objects = []
        for cat_name in all_categories:
            obj, _ = Category.objects.get_or_create(name=cat_name, user=demo_user)
            category_objects.append(obj)
        self.stdout.write(f'Создано категорий: {len(category_objects)}')

        # 3. Сервисы
        service_objects = []
        for services_list in cats_and_services.values():
            for srv_name in services_list:
                obj, _ = Service.objects.get_or_create(name=srv_name, user=demo_user)
                service_objects.append(obj)
        self.stdout.write(f'Создано сервисов: {len(service_objects)}')

        # 4. Создание обязательных финансовых продуктов (1 кредитный + 3 дебетовые карты)
        credit_account, _ = FinancialProduct.objects.get_or_create(
            user=demo_user,
            product_type=ProductType.CREDIT_CARD,
            bank_name=Bank.T_BANK,
            currency_code=Currency.RUB,
            defaults={'serial_number': '0001', 'custom_name': 'Кредитка Т-Банк', 'amount': 0}
        )
        debit_accounts = []
        debit_banks = [
            (Bank.SBER, 'Дебетовая Сбер', '1001'),
            (Bank.VTB, 'Дебетовая ВТБ', '1002'),
            (Bank.ALFA, 'Дебетовая Альфа', '1003'),
        ]
        for bank, name, serial in debit_banks:
            obj, _ = FinancialProduct.objects.get_or_create(
                user=demo_user,
                product_type=ProductType.DEBIT_CARD,
                bank_name=bank,
                currency_code=Currency.RUB,
                defaults={'serial_number': serial, 'custom_name': name, 'amount': 0}
            )
            debit_accounts.append(obj)

        all_products = list(FinancialProduct.objects.filter(user=demo_user))

        # 5. Предстоящие платежи
        if service_objects:
            for _ in range(options['payments']):
                UpcomingPaymentFactory(
                    user=demo_user,
                    service=random.choice(service_objects),
                    account=random.choice(all_products)
                )
        self.stdout.write(f'Создано платежей: {options["payments"]}')

        # Генерация переводов по паттернам
        today = timezone.now().date()
        start_date = today - timedelta(days=2*365)
        end_date = today

        total_ops = options['operations']
        transfer_target = int(total_ops * 0.20)

        cafe_cat = Category.objects.get(name='Кафе', user=demo_user)
        coffee_service = Service.objects.get(name='Кофе Хауз', user=demo_user)
        bread_service = Service.objects.get(name='Хлебница', user=demo_user)
        flowwow_service = Service.objects.get(name='Flowwow', user=demo_user)
        unforeseen_cat = Category.objects.get(name='Непредвиденные', user=demo_user)
        gift_cat = Category.objects.get(name='Подарки', user=demo_user)

        def possible_dates_pattern1(start, end):
            dates = []
            d = start
            while d <= end:
                if random.random() < 0.2:
                    dates.append(d)
                d += timedelta(days=1)
            return dates

        def possible_dates_pattern2(start, end):
            dates = []
            current = date(start.year, start.month, 1)
            while current <= end:
                next_month = current.replace(day=1) + timedelta(days=31)
                last_day_of_month = next_month.replace(day=1) - timedelta(days=1)
                max_day = min(20, last_day_of_month.day)
                if max_day >= 12:
                    possible_day = random.randint(12, max_day)
                    d = current.replace(day=possible_day)
                    if start <= d <= end:
                        dates.append(d)
                if current.month == 12:
                    current = current.replace(year=current.year+1, month=1, day=1)
                else:
                    current = current.replace(month=current.month+1, day=1)
            return dates

        def possible_dates_pattern3(start, end):
            dates = []
            current = date(start.year, start.month, 1)
            while current <= end:
                d1 = current.replace(day=random.randint(1, 10))
                if start <= d1 <= end:
                    dates.append(d1)
                next_month = current.replace(day=1) + timedelta(days=31)
                last_day = (next_month.replace(day=1) - timedelta(days=1)).day
                day2 = random.randint(20, min(28, last_day))
                d2 = current.replace(day=day2)
                if start <= d2 <= end:
                    dates.append(d2)
                if current.month == 12:
                    current = current.replace(year=current.year+1, month=1, day=1)
                else:
                    current = current.replace(month=current.month+1, day=1)
            return dates

        def possible_dates_pattern4(start, end):
            dates = []
            d = start + timedelta(days=random.randint(0, 45))
            while d <= end:
                dates.append(d)
                d += timedelta(days=45) + timedelta(days=random.randint(-5, 5))
            return dates

        all_possible = []
        all_possible.extend([(d, 1) for d in possible_dates_pattern1(start_date, end_date)])
        all_possible.extend([(d, 2) for d in possible_dates_pattern2(start_date, end_date)])
        all_possible.extend([(d, 3) for d in possible_dates_pattern3(start_date, end_date)])
        all_possible.extend([(d, 4) for d in possible_dates_pattern4(start_date, end_date)])

        if len(all_possible) <= transfer_target:
            selected = all_possible
        else:
            selected = random.sample(all_possible, transfer_target)

        def get_account_for_amount(amount, currency):
            use_credit = (currency == 'RUB' and amount >= 5000) or \
                         (currency == 'CNY' and amount >= 150) or \
                         (currency == 'USD' and amount >= 50)
            if use_credit:
                return credit_account
            return random.choice(debit_accounts)

        transfers = []
        for d, pattern in selected:
            if pattern == 1:  # Завтрак 9-13
                t = random_time_in_range(9, 13)
                srv = random.choice([coffee_service, bread_service])
                amount = round(random.uniform(250, 525), 2)
                account = get_account_for_amount(amount, 'RUB')
                transfers.append(
                    Operation(user=demo_user, operation_type=OperationType.TRANSFER,
                              category=cafe_cat, service=srv, account=account,
                              currency_code='RUB', amount=amount,
                              note='Завтрак в кафе', operation_date=d, operation_time=t))
            elif pattern == 2:  # Перевод маме (день/вечер)
                hour_window = random.choice([(12, 18), (18, 22)])
                t = random_time_in_range(*hour_window)
                amount = round(random.uniform(2500, 5000), 2)
                account = get_account_for_amount(amount, 'RUB')
                transfers.append(
                    Operation(user=demo_user, operation_type=OperationType.TRANSFER,
                              category=None, service=None, account=account,
                              currency_code='RUB', amount=amount,
                              note='Перевод маме', operation_date=d, operation_time=t))
            elif pattern == 3:  # Цветы (утро 7-11 или вечер 17-21)
                hour_window = random.choice([(7, 11), (17, 21)])
                t = random_time_in_range(*hour_window)
                amount = round(random.uniform(3500, 6000), 2)
                account = get_account_for_amount(amount, 'RUB')
                transfers.append(
                    Operation(user=demo_user, operation_type=OperationType.TRANSFER,
                              category=gift_cat, service=flowwow_service, account=account,
                              currency_code='RUB', amount=amount,
                              note='', operation_date=d, operation_time=t))
            elif pattern == 4:  # Автосервис (день 10-18)
                t = random_time_in_range(10, 18)
                amount = round(random.uniform(5000, 15000), 2)
                account = get_account_for_amount(amount, 'RUB')
                transfers.append(
                    Operation(user=demo_user, operation_type=OperationType.TRANSFER,
                              category=unforeseen_cat, service=None, account=account,
                              currency_code='RUB', amount=amount,
                              note='', operation_date=d, operation_time=t))

        Operation.objects.bulk_create(transfers)
        transfer_count = len(transfers)
        self.stdout.write(f'Создано переводов: {transfer_count}')

        # Оставшиеся операции (расходы/доходы)
        remaining_ops = total_ops - transfer_count
        if remaining_ops < 0:
            self.stdout.write(self.style.WARNING(
                f'Переводов ({transfer_count}) больше, чем общее число операций ({total_ops}). '
                f'Операции только из переводов.'
            ))
            expense_count = 0
            income_count = 0
        else:
            expense_count = int(remaining_ops * 0.72 / 0.80)
            income_count = remaining_ops - expense_count

        income_cat_objs = [c for c in category_objects if c.name in income_cats.split(', ')]
        outcome_cat_objs = [c for c in category_objects if c.name in outcome_cats.split(', ')]

        # Расходы
        for _ in range(expense_count):
            cat = random.choice(outcome_cat_objs)
            if cat.name in cats_and_services:
                service = random.choice(cats_and_services[cat.name])
                service_obj = Service.objects.get(name=service, user=demo_user)
            else:
                service_obj = None

            currency = random_currency()
            amount = gauss_amount(currency)

            # Выбор счета
            if currency == 'RUB' and amount >= 5000 or (currency in ('CNY','USD') and amount >= 50):
                account = credit_account
            else:
                account = random.choice(debit_accounts)

            window = get_time_window_for_category(cat.name, is_income=False)
            op_date, op_time = random_datetime_between(start_date, end_date, allowed_hours=window)

            Operation.objects.create(
                user=demo_user,
                operation_type=OperationType.EXPENSE,
                category=cat,
                service=service_obj,
                account=account,
                currency_code=currency,
                amount=amount,
                note='',
                operation_date=op_date,
                operation_time=op_time
            )

        # Доходы
        small_income_cats = {'Кэшбэк', 'Подарки', 'Дивиденды'}
        for _ in range(income_count):
            cat = random.choice(income_cat_objs)
            if cat.name == 'Зарплата':
                amount = round(random.uniform(50000, 150000), 2)
            elif cat.name == 'Подработка':
                amount = round(random.uniform(25000, 75000), 2)
            elif cat.name in small_income_cats:
                amount = round(random.uniform(1500, 5000), 2)
            else:
                amount = round(random.uniform(50000, 150000), 2)

            account = random.choice(debit_accounts)

            window = get_time_window_for_category(cat.name, is_income=True)
            op_date, op_time = random_datetime_between(start_date, end_date, allowed_hours=window)

            Operation.objects.create(
                user=demo_user,
                operation_type=OperationType.INCOME,
                category=cat,
                service=None,
                account=account,
                currency_code='RUB',
                amount=amount,
                note='',
                operation_date=op_date,
                operation_time=op_time
            )

        products = list(FinancialProduct.objects.filter(user=demo_user))
        if products:
            total_balance = 0
            for product in products:
                income_sum = Operation.objects.filter(
                    user=demo_user, account=product,
                    operation_type=OperationType.INCOME
                ).aggregate(s=Sum('amount'))['s'] or 0
                expense_sum = Operation.objects.filter(
                    user=demo_user, account=product,
                    operation_type__in=[OperationType.EXPENSE, OperationType.TRANSFER]
                ).aggregate(s=Sum('amount'))['s'] or 0
                total_balance += income_sum - expense_sum

            target_per_product = max(0, total_balance) / len(products)
            for product in products:
                product.amount = target_per_product
                product.save(update_fields=['amount'])

        self.stdout.write('Балансы финансовых продуктов перераспределены равномерно')
        self.stdout.write(f'Создано расходов: {expense_count}')
        self.stdout.write(f'Создано доходов: {income_count}')
        self.stdout.write(self.style.SUCCESS('Демо-данные успешно сгенерированы'))