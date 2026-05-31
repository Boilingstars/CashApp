import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .concurrency import LLMQueueFullError, LLMRateLimitError, acquire_llm_slot, release_llm_slot
from .indexing import retrieve_rag_context
from .llm_clients import get_chat_client
from .models import ChatMessage, ChatSession
from .serializers import ChatMessageSerializer

logger = logging.getLogger(__name__)


def _build_rag_context_block(chunks: list[dict]) -> str:
    if not chunks:
        return (
            'Финансовые данные пользователя в системе не найдены. '
            'Сообщи об этом и задай уточняющие вопросы.'
        )
    lines = [
        'Финансовые данные пользователя (обязательно учитывай в ответе):',
    ]
    if any(c.get('metadata', {}).get('source') == 'operation' for c in chunks):
        lines.append('Ниже — операции/траты с категориями. Суммируй и анализируй их при ответе.')
    if any(c.get('metadata', {}).get('source') == 'debt_burden_indicator' for c in chunks):
        lines.append(
            'Ниже указан кредитный индекс (долговая нагрузка). '
            'При вопросах о кредите обязательно ссылайся на эти цифры.'
        )
    for chunk in chunks:
        lines.append(f'- {chunk["text"]}')
    return '\n'.join(lines)


def _compact_rag_context(chunks: list[dict]) -> list[dict]:
    return [
        {
            'chunk_id': chunk['chunk_id'],
            'score': chunk.get('score', 0),
            'text_snippet': chunk['text'][:200],
        }
        for chunk in chunks
    ]


class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id=None):
        user = request.user
        content = request.data.get('content', '').strip()

        if not content:
            return Response({'error': 'Сообщение не может быть пустым'}, status=400)

        max_len = getattr(settings, 'MAX_CHAT_MESSAGE_LENGTH', 4000)
        if len(content) > max_len:
            return Response(
                {'error': f'Сообщение не должно превышать {max_len} символов'},
                status=400,
            )

        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=user, is_active=True)
            except ChatSession.DoesNotExist:
                return Response({'error': 'Сессия не найдена'}, status=404)
        else:
            session = ChatSession.objects.create(user=user)
            if len(content) <= 255:
                session.title = content[:255]
                session.save(update_fields=['title'])

        try:
            rag_chunks = retrieve_rag_context(user.id, content)
        except Exception as exc:
            logger.error('RAG context failed for user %s: %s', user.id, exc)
            rag_chunks = []

        base_prompt = session.system_prompt or settings.DEFAULT_SYSTEM_PROMPT
        context_block = _build_rag_context_block(rag_chunks)
        system_prompt = f'{base_prompt}\n\n{context_block}'

        history_limit = getattr(settings, 'MAX_CHAT_HISTORY_MESSAGES', 20)
        history = (
            ChatMessage.objects.filter(session=session)
            .order_by('-created_at')[:history_limit]
        )
        messages = [{'role': 'system', 'content': system_prompt}]
        for msg in reversed(list(history)):
            messages.append({'role': msg.role, 'content': msg.content})
        messages.append({'role': 'user', 'content': content})

        if not settings.LLM_API_KEY:
            return Response({'error': 'LLM API не настроен'}, status=503)

        user_message = ChatMessage.objects.create(
            session=session,
            role='user',
            content=content,
        )

        llm_token = None
        try:
            llm_token = acquire_llm_slot(user.id)
            client = get_chat_client()
            response = client.chat.completions.create(
                model=settings.LLM_CHAT_MODEL,
                messages=messages,
                temperature=0.3,
                stream=False,
            )
            assistant_content = response.choices[0].message.content
        except LLMRateLimitError as exc:
            user_message.delete()
            return Response({'error': str(exc)}, status=429)
        except LLMQueueFullError as exc:
            user_message.delete()
            return Response({'error': str(exc)}, status=503)
        except Exception as exc:
            exc_name = type(exc).__name__
            if exc_name in ('APITimeoutError', 'TimeoutException', 'ReadTimeout'):
                logger.error('LLM API timeout: %s', exc)
                user_message.delete()
                return Response(
                    {'error': 'Нейросеть не ответила вовремя, попробуйте ещё раз'},
                    status=504,
                )
            logger.error('LLM API error: %s', exc)
            user_message.delete()
            return Response({'error': 'Ошибка при обращении к нейросети'}, status=502)
        finally:
            release_llm_slot(llm_token)

        assistant_message = ChatMessage.objects.create(
            session=session,
            role='assistant',
            content=assistant_content,
            rag_context=_compact_rag_context(rag_chunks),
        )

        serializer = ChatMessageSerializer(assistant_message)
        return Response(
            {
                **serializer.data,
                'session_id': session.id,
            },
            status=status.HTTP_201_CREATED,
        )
