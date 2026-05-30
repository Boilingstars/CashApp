from django.conf import settings
from openai import OpenAI


def get_chat_client() -> OpenAI:
    if not settings.LLM_API_KEY:
        raise ValueError('LLM_API_KEY не настроен')
    return OpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )


def get_embedding_client() -> OpenAI:
    if not settings.LLM_API_KEY:
        raise ValueError('LLM_API_KEY не настроен')
    return OpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )
