from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from chat.indexing import sync_user_financial_chunks

User = get_user_model()


class Command(BaseCommand):
    help = 'Синхронизировать финансовые данные пользователей в Redis для RAG'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, help='ID конкретного пользователя')
        parser.add_argument(
            '--all',
            action='store_true',
            help='Синхронизировать всех пользователей',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        sync_all = options.get('all')

        if user_id:
            sync_user_financial_chunks(user_id)
            self.stdout.write(self.style.SUCCESS(f'User {user_id} synced'))
            return

        if sync_all:
            for uid in User.objects.values_list('id', flat=True):
                sync_user_financial_chunks(uid)
            self.stdout.write(self.style.SUCCESS('All users synced'))
            return

        self.stderr.write('Укажите --user-id ID или --all')
