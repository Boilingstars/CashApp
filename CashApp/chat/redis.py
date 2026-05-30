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
INDEX_DIM_KEY = 'rag_index_vector_dim'

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


def _decode(value):
    if isinstance(value, bytes):
        return value.decode('utf-8')
    return value


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


def _json_get_chunk(key: bytes | str) -> dict | None:
    data = get_redis().json().get(key)
    if not data:
        return None
    if isinstance(data, list):
        data = data[0] if data else None
    return data


def _chunk_from_json(key: bytes | str, data: dict, score: float = 0.0) -> dict:
    key_str = _decode(key)
    text = _decode(data.get('text', ''))
    metadata = _parse_metadata(data.get('metadata'))
    embedding_raw = data.get('embedding')
    embedding = None
    if embedding_raw is not None:
        embedding = np.asarray(embedding_raw, dtype=np.float32)
    return {
        'chunk_id': key_str,
        'text': text,
        'metadata': metadata,
        'score': score,
        'embedding': embedding,
    }


def get_embedding(text: str, cache_key: str | None = None) -> np.ndarray:
    redis_conn = get_redis()

    if cache_key:
        cached = redis_conn.get(cache_key)
        if cached:
            return np.frombuffer(cached, dtype=np.float32)

    embedding = encode_text(text)

    if cache_key:
        redis_conn.set(cache_key, embedding.tobytes(), ex=settings.CHAT_EMBEDDING_CACHE_TTL)

    return embedding


def _index_needs_recreate() -> bool:
    redis_conn = get_redis()
    stored = redis_conn.get(INDEX_DIM_KEY)
    current = str(settings.EMBEDDING_VECTOR_DIM).encode()
    return bool(stored and stored != current)


def create_vector_index(force: bool = False):
    redis_conn = get_redis()
    index = redis_conn.ft(INDEX_NAME)
    expected_dim = settings.EMBEDDING_VECTOR_DIM

    if force or _index_needs_recreate():
        try:
            index.dropindex(delete_documents=False)
            logger.info('Dropped Redis vector index for recreation')
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
    redis_conn.set(INDEX_DIM_KEY, str(expected_dim))
    logger.info('Redis vector index created (dim=%s)', expected_dim)


def store_chunks_batch(user_id: int, chunks: list[dict], embeddings: np.ndarray):
    if len(chunks) != len(embeddings):
        raise ValueError('chunks and embeddings length mismatch')

    pipe = get_redis().pipeline()
    for chunk, embedding in zip(chunks, embeddings):
        chunk_id = chunk['chunk_id']
        metadata = chunk['metadata']
        chunk_data = {
            'user_id': str(user_id),
            'source': metadata.get('source', 'unknown'),
            'operation_date_num': operation_date_to_num(metadata.get('operation_date')),
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


def count_user_chunks(user_id: int) -> int:
    redis_conn = get_redis()
    pattern = f'{CHUNK_PREFIX}{user_id}:*'
    count = 0
    cursor = 0
    while True:
        cursor, keys = redis_conn.scan(cursor, match=pattern, count=200)
        count += len(keys)
        if cursor == 0:
            break
    return count


def fetch_user_chunks_scan(user_id: int, source: str | None = None) -> list[dict]:
    """Надёжное чтение чанков напрямую из Redis JSON (без RediSearch)."""
    redis_conn = get_redis()
    pattern = f'{CHUNK_PREFIX}{user_id}:*'
    chunks = []
    cursor = 0

    while True:
        cursor, keys = redis_conn.scan(cursor, match=pattern, count=200)
        for key in keys:
            data = _json_get_chunk(key)
            if not data:
                continue
            src = _decode(data.get('source', ''))
            if source and src != source:
                continue
            chunks.append(_chunk_from_json(key, data))
        if cursor == 0:
            break

    return chunks


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a is None or b is None or not a.size or not b.size:
        return 0.0
    return float(np.dot(a, b))


def search_similar_chunks_local(query_text: str, user_id: int, top_k: int) -> list[dict]:
    """Локальный cosine search по эмбеддингам из Redis JSON."""
    query_embedding = get_embedding(query_text)
    candidates = fetch_user_chunks_scan(user_id)
    if not candidates:
        return []

    scored = []
    for chunk in candidates:
        embedding = chunk.pop('embedding', None)
        if embedding is None:
            continue
        chunk['score'] = _cosine_similarity(query_embedding, embedding)
        scored.append(chunk)

    scored.sort(key=lambda item: item['score'], reverse=True)
    return scored[:top_k]


def search_similar_chunks(query_text: str, user_id: int, top_k: int | None = None) -> list[dict]:
    top_k = top_k or settings.RAG_TOP_K
    redis_conn = get_redis()
    query_embedding = get_embedding(query_text)
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
        if results.docs:
            chunks = []
            for doc in results.docs:
                doc_id = _decode(doc.id)
                text = _decode(doc.text)
                metadata_raw = doc.metadata
                chunks.append(
                    {
                        'chunk_id': doc_id,
                        'text': text,
                        'metadata': _parse_metadata(_decode(metadata_raw) if metadata_raw else None),
                        'score': float(doc.score),
                    }
                )
            return chunks
    except ResponseError as exc:
        logger.warning('Redis KNN failed, using local search: %s', exc)

    return search_similar_chunks_local(query_text, user_id, top_k)


def fetch_user_chunks_by_source(user_id: int, source: str) -> list[dict]:
    chunks = fetch_user_chunks_scan(user_id, source=source)
    if chunks:
        return [{k: v for k, v in chunk.items() if k != 'embedding'} for chunk in chunks]

    redis_conn = get_redis()
    q = Query(f'@user_id:{{{user_id}}} @source:{{{source}}}').return_fields('text', 'metadata').paging(0, 10000).dialect(2)
    try:
        results = redis_conn.ft(INDEX_NAME).search(q)
    except ResponseError as exc:
        logger.warning('Redis fetch by source failed for %s: %s', source, exc)
        return []

    chunks = []
    for doc in results.docs:
        doc_id = _decode(doc.id)
        text = _decode(doc.text)
        metadata_raw = doc.metadata
        chunks.append(
            {
                'chunk_id': doc_id,
                'text': text,
                'metadata': _parse_metadata(_decode(metadata_raw) if metadata_raw else None),
                'score': 0.0,
            }
        )
    return chunks
