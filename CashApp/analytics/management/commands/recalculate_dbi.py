from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from analytics.services import recalculate_dbi_for_user

User = get_user_model()


class Command(BaseCommand):
    help = 'Пересчитать кредитный индекс (DBI) за текущий или указанный месяц'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, help='ID пользователя')
        parser.add_argument('--all', action='store_true', help='Все пользователи')
        parser.add_argument('--year', type=int, help='Год (по умолчанию — текущий)')
        parser.add_argument('--month', type=int, help='Месяц 1-12 (по умолчанию — текущий)')

    def handle(self, *args, **options):
        year = options.get('year')
        month = options.get('month')
        user_id = options.get('user_id')
        sync_all = options.get('all')

        if user_id:
            dbi = recalculate_dbi_for_user(user_id, year=year, month=month)
            self.stdout.write(
                self.style.SUCCESS(
                    f'User {user_id}: indicator={dbi.indicator} '
                    f'credit={dbi.credit_payments} income={dbi.income_total}'
                )
            )
            return

        if sync_all:
            for uid in User.objects.values_list('id', flat=True):
                recalculate_dbi_for_user(uid, year=year, month=month, sync_rag=False)
            self.stdout.write(self.style.SUCCESS('DBI пересчитан для всех пользователей'))
            return

        self.stderr.write('Укажите --user-id ID или --all')
