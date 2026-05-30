from django.core.management.base import BaseCommand

from chat.redis import create_vector_index


class Command(BaseCommand):
    help = 'Создать индекс RediSearch для RAG (если ещё не существует)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пересоздать индекс (существующие документы не удаляются)',
        )

    def handle(self, *args, **options):
        create_vector_index(force=options['force'])
        self.stdout.write(self.style.SUCCESS('Redis vector index is ready'))
