from django.conf import settings
from django.core.management.base import BaseCommand

from chat.redis import INDEX_NAME, create_vector_index, get_redis


class Command(BaseCommand):
    help = 'Создать индекс RediSearch для RAG (если ещё не существует)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Пересоздать индекс (документы не удаляются)',
        )
        parser.add_argument(
            '--recreate-if-dim-changed',
            action='store_true',
            help='Пересоздать индекс, если изменилась размерность эмбеддингов',
        )

    def handle(self, *args, **options):
        force = options['force']
        redis_conn = get_redis()
        version_key = 'rag_index_vector_dim'

        if options['recreate_if_dim_changed']:
            stored_dim = redis_conn.get(version_key)
            current_dim = str(settings.EMBEDDING_VECTOR_DIM).encode()
            if stored_dim and stored_dim != current_dim:
                self.stdout.write(self.style.WARNING('Vector dimension changed, recreating index'))
                force = True

        create_vector_index(force=force)
        redis_conn.set(version_key, str(settings.EMBEDDING_VECTOR_DIM))
        self.stdout.write(self.style.SUCCESS(f'Redis vector index {INDEX_NAME} is ready (dim={settings.EMBEDDING_VECTOR_DIM})'))
