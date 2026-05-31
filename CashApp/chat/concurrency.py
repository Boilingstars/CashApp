import logging
import time
import uuid

from django.conf import settings

from .redis import get_redis

logger = logging.getLogger(__name__)

LLM_SEMAPHORE_KEY = 'llm:semaphore:slots'
LLM_USER_COOLDOWN_PREFIX = 'llm:cooldown:user:'


class LLMRateLimitError(Exception):
    """Слишком частые запросы от одного пользователя."""


class LLMQueueFullError(Exception):
    """Все слоты для LLM API заняты."""


def acquire_llm_slot(user_id: int) -> str:
    """
    Ограничить параллельные вызовы DeepSeek и частоту запросов пользователя.
    Возвращает token для release_llm_slot().
    """
    redis = get_redis()
    cooldown_key = f'{LLM_USER_COOLDOWN_PREFIX}{user_id}'.encode()

    if not redis.set(cooldown_key, b'1', nx=True, ex=settings.LLM_USER_COOLDOWN_SECONDS):
        raise LLMRateLimitError(
            f'Подождите {settings.LLM_USER_COOLDOWN_SECONDS} сек. перед следующим сообщением'
        )

    token = str(uuid.uuid4())
    deadline = time.monotonic() + settings.LLM_SLOT_WAIT_SECONDS
    max_slots = settings.LLM_MAX_CONCURRENT_REQUESTS

    while time.monotonic() < deadline:
        pipe = redis.pipeline()
        pipe.scard(LLM_SEMAPHORE_KEY)
        pipe.sadd(LLM_SEMAPHORE_KEY, token)
        pipe.expire(LLM_SEMAPHORE_KEY, settings.LLM_SEMAPHORE_TTL_SECONDS)
        current, added, _ = pipe.execute()

        if added and current < max_slots:
            logger.debug('LLM slot acquired for user %s (%s/%s)', user_id, current + 1, max_slots)
            return token

        redis.srem(LLM_SEMAPHORE_KEY, token)
        time.sleep(0.25)

    redis.delete(cooldown_key)
    raise LLMQueueFullError('Сервис перегружен, попробуйте через несколько секунд')


def release_llm_slot(token: str | None):
    if not token:
        return
    try:
        get_redis().srem(LLM_SEMAPHORE_KEY, token)
    except Exception as exc:
        logger.warning('Failed to release LLM slot: %s', exc)
