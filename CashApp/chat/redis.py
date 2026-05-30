import json
import logging

import numpy as np
from django.conf import settings
from openai import OpenAI
from redis import Redis
from redis.commands.search.field import TagField, TextField, VectorField
from redis.commands.search.index_definition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from redis.exceptions import ResponseError

logger = logging.getLogger(__name__)

INDEX_NAME = 'idx:chunks'
CHUNK_PREFIX = 'chunk:'
EMBEDDING_MODEL = 'text-embedding-3-small'
VECTOR_DIM = 1536

_redis_conn = None


def get_redis() -> Redis:
    global _redis_conn
    if _redis_conn is None:
        _redis_conn = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            decode_responses=False,
        )
    return _redis_conn


def _parse_metadata(raw) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, bytes):
        raw = raw.decode('utf-8')
    if isinstance(raw, str):
        return json.loads(raw)
    return {}


def get_embedding(text: str, cache_key: str | None = None) -> np.ndarray:
    """Получить эмбеддинг текста; опционально кешировать в Redis."""
    redis_conn = get_redis()

    if cache_key:
        cached = redis_conn.get(cache_key)
        if cached:
            return np.frombuffer(cached, dtype=np.float32)

    if not settings.OPENAI_API_KEY:
        raise ValueError('OPENAI_API_KEY не настроен')

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(input=text, model=EMBEDDING_MODEL)
    embedding = np.array(response.data[0].embedding, dtype=np.float32)

    if cache_key:
        ttl = getattr(settings, 'CHAT_EMBEDDING_CACHE_TTL', 604800)
        redis_conn.set(cache_key, embedding.tobytes(), ex=ttl)

    return embedding


def create_vector_index(force: bool = False):
    """Создать индекс RediSearch для векторного поиска по чанкам."""
    redis_conn = get_redis()
    index = redis_conn.ft(INDEX_NAME)

    if force:
        try:
            index.dropindex(delete_documents=False)
        except ResponseError:
            pass

    try:
        index.info()
        logger.info('Redis vector index already exists')
        return
    except ResponseError:
        pass

    schema = (
        TagField('$.user_id', as_name='user_id'),
        TextField('$.text', as_name='text'),
        TextField('$.metadata', as_name='metadata'),
        VectorField(
            '$.embedding',
            'FLAT',
            {
                'TYPE': 'FLOAT32',
                'DIM': VECTOR_DIM,
                'DISTANCE_METRIC': 'COSINE',
            },
            as_name='embedding',
        ),
    )
    definition = IndexDefinition(prefix=[CHUNK_PREFIX], index_type=IndexType.JSON)
    index.create_index(schema, definition=definition)
    logger.info('Redis vector index created')


def store_chunk(chunk_id: str, user_id: int, text: str, metadata: dict):
    """Сохранить чанк с эмбеддингом, привязанный к пользователю."""
    redis_conn = get_redis()
    embedding = get_embedding(text, cache_key=f'emb:chunk:{chunk_id}')
    chunk_data = {
        'user_id': str(user_id),
        'text': text,
        'metadata': json.dumps(metadata, ensure_ascii=False),
        'embedding': embedding.tolist(),
    }
    redis_conn.json().set(f'{CHUNK_PREFIX}{chunk_id}', '$', chunk_data)


def delete_user_chunks(user_id: int):
    """Удалить все чанки пользователя из Redis."""
    redis_conn = get_redis()
    pattern = f'{CHUNK_PREFIX}{user_id}:*'
    cursor = 0
    while True:
        cursor, keys = redis_conn.scan(cursor, match=pattern, count=100)
        if keys:
            redis_conn.delete(*keys)
        if cursor == 0:
            break
    redis_conn.delete(f'rag_synced:{user_id}')


def user_has_chunks(user_id: int) -> bool:
    redis_conn = get_redis()
    query = Query(f'@user_id:{{{user_id}}}').paging(0, 1).dialect(2)
    try:
        results = redis_conn.ft(INDEX_NAME).search(query)
        return bool(results.docs)
    except ResponseError:
        return False


def search_similar_chunks(query_text: str, user_id: int, top_k: int | None = None) -> list[dict]:
    """Найти релевантные чанки только для указанного пользователя."""
    redis_conn = get_redis()
    top_k = top_k or settings.RAG_TOP_K
    query_embedding = get_embedding(query_text)
    binary_vector = query_embedding.tobytes()

    q = (
        Query(f'(@user_id:{{{user_id}}})=>[KNN {top_k} @embedding $vec AS score]')
        .sort_by('score')
        .return_fields('text', 'metadata', 'score')
        .paging(0, top_k)
        .dialect(2)
    )

    try:
        results = redis_conn.ft(INDEX_NAME).search(q, query_params={'vec': binary_vector})
    except ResponseError as exc:
        logger.error('Redis vector search failed: %s', exc)
        return []

    chunks = []
    for doc in results.docs:
        doc_id = doc.id.decode() if isinstance(doc.id, bytes) else doc.id
        text = doc.text.decode() if isinstance(doc.text, bytes) else doc.text
        metadata_raw = doc.metadata
        if isinstance(metadata_raw, bytes):
            metadata_raw = metadata_raw.decode()
        chunks.append(
            {
                'chunk_id': doc_id,
                'text': text,
                'metadata': _parse_metadata(metadata_raw),
                'score': float(doc.score),
            }
        )
    return chunks


def cache_message_embedding(message_id: int, user_id: int, text: str) -> str:
    """Закешировать эмбеддинг сообщения; вернуть ключ кеша."""
    cache_key = f'emb:msg:{user_id}:{message_id}'
    get_embedding(text, cache_key=cache_key)
    return cache_key
