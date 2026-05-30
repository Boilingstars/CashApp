import json
import logging

import numpy as np
from django.conf import settings
from redis import Redis
from redis.commands.search.field import NumericField, TagField, TextField, VectorField
from redis.commands.search.index_definition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from redis.exceptions import ResponseError

from .date_utils import operation_date_to_num
from .embeddings import encode_text

logger = logging.getLogger(__name__)

INDEX_NAME = 'idx:chunks'
CHUNK_PREFIX = 'chunk:'

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
    """Локальный эмбеддинг через sentence-transformers; опционально кеш в Redis."""
    redis_conn = get_redis()

    if cache_key:
        cached = redis_conn.get(cache_key)
        if cached:
            return np.frombuffer(cached, dtype=np.float32)

    embedding = encode_text(text)

    if cache_key:
        redis_conn.set(cache_key, embedding.tobytes(), ex=settings.CHAT_EMBEDDING_CACHE_TTL)

    return embedding


def create_vector_index(force: bool = False):
    """Создать или пересоздать индекс RediSearch под текущую размерность эмбеддингов."""
    redis_conn = get_redis()
    index = redis_conn.ft(INDEX_NAME)
    expected_dim = settings.EMBEDDING_VECTOR_DIM

    if force:
        try:
            index.dropindex(delete_documents=False)
        except ResponseError:
            pass
    else:
        try:
            index.info()
            logger.info('Redis vector index already exists')
            return
        except ResponseError:
            pass

    schema = (
        TagField('$.user_id', as_name='user_id'),
        TagField('$.source', as_name='source'),
        NumericField('$.operation_date_num', as_name='operation_date_num'),
        TextField('$.text', as_name='text'),
        TextField('$.metadata', as_name='metadata'),
        VectorField(
            '$.embedding',
            'FLAT',
            {
                'TYPE': 'FLOAT32',
                'DIM': expected_dim,
                'DISTANCE_METRIC': 'COSINE',
            },
            as_name='embedding',
        ),
    )
    definition = IndexDefinition(prefix=[CHUNK_PREFIX], index_type=IndexType.JSON)
    index.create_index(schema, definition=definition)
    logger.info('Redis vector index created (dim=%s)', expected_dim)


def store_chunk(
    chunk_id: str,
    user_id: int,
    text: str,
    metadata: dict,
    embedding: np.ndarray | None = None,
):
    """Сохранить чанк с эмбеддингом в Redis JSON."""
    redis_conn = get_redis()
    if embedding is None:
        embedding = get_embedding(text, cache_key=f'emb:chunk:{chunk_id}')

    operation_date_num = operation_date_to_num(metadata.get('operation_date'))

    chunk_data = {
        'user_id': str(user_id),
        'source': metadata.get('source', 'unknown'),
        'operation_date_num': operation_date_num,
        'text': text,
        'metadata': json.dumps(metadata, ensure_ascii=False),
        'embedding': embedding.tolist(),
    }
    redis_conn.json().set(f'{CHUNK_PREFIX}{chunk_id}', '$', chunk_data)


def store_chunks_batch(user_id: int, chunks: list[dict], embeddings: np.ndarray):
    """Пакетная запись чанков с уже посчитанными эмбеддингами."""
    if len(chunks) != len(embeddings):
        raise ValueError('chunks and embeddings length mismatch')

    pipe = get_redis().pipeline()
    for chunk, embedding in zip(chunks, embeddings):
        chunk_id = chunk['chunk_id']
        metadata = chunk['metadata']
        operation_date_num = operation_date_to_num(metadata.get('operation_date'))

        chunk_data = {
            'user_id': str(user_id),
            'source': metadata.get('source', 'unknown'),
            'operation_date_num': operation_date_num,
            'text': chunk['text'],
            'metadata': json.dumps(metadata, ensure_ascii=False),
            'embedding': np.asarray(embedding, dtype=np.float32).tolist(),
        }
        pipe.json().set(f'{CHUNK_PREFIX}{chunk_id}', '$', chunk_data)
    pipe.execute()


def delete_user_chunks(user_id: int):
    redis_conn = get_redis()
    pattern = f'{CHUNK_PREFIX}{user_id}:*'
    cursor = 0
    while True:
        cursor, keys = redis_conn.scan(cursor, match=pattern, count=200)
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
    """KNN-поиск по эмбеддингу запроса среди чанков пользователя."""
    redis_conn = get_redis()
    top_k = top_k or settings.RAG_TOP_K
    query_embedding = get_embedding(query_text, cache_key=f'emb:query:{user_id}:{hash(query_text)}')
    binary_vector = query_embedding.tobytes()

    q = (
        Query(f'(@user_id:{{{user_id}}})=>[KNN {top_k} @embedding $vec AS score]')
        .sort_by('score')
        .return_fields('text', 'metadata', 'source', 'score')
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


def fetch_user_chunks_by_source(user_id: int, source: str) -> list[dict]:
    """Получить все чанки пользователя указанного типа (для периодных операций)."""
    redis_conn = get_redis()
    q = Query(f'@user_id:{{{user_id}}} @source:{{{source}}}').return_fields('text', 'metadata').paging(0, 10000).dialect(2)
    try:
        results = redis_conn.ft(INDEX_NAME).search(q)
    except ResponseError as exc:
        logger.error('Redis fetch by source failed: %s', exc)
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
                'score': 0.0,
            }
        )
    return chunks
