import logging
import threading

import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()


def get_embedding_model():
    """Singleton SentenceTransformer — загружается один раз на процесс."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                model_name = settings.EMBEDDING_MODEL_NAME
                logger.info('Loading embedding model: %s', model_name)
                _model = SentenceTransformer(model_name)
                logger.info('Embedding model ready (dim=%s)', settings.EMBEDDING_VECTOR_DIM)
    return _model


def warmup_embedding_model():
    """Предзагрузка модели при старте контейнера."""
    get_embedding_model()
    encode_text('warmup')


def encode_text(text: str) -> np.ndarray:
    if not text or not text.strip():
        return np.zeros(settings.EMBEDDING_VECTOR_DIM, dtype=np.float32)
    model = get_embedding_model()
    vector = model.encode(
        text,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(vector, dtype=np.float32)


def encode_texts(texts: list[str], batch_size: int | None = None) -> np.ndarray:
    if not texts:
        return np.empty((0, settings.EMBEDDING_VECTOR_DIM), dtype=np.float32)

    batch_size = batch_size or settings.EMBEDDING_BATCH_SIZE
    model = get_embedding_model()
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype=np.float32)
