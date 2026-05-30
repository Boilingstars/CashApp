import logging

from django.conf import settings
from django.db import transaction
from openai import OpenAI
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .indexing import ensure_user_chunks
from .models import ChatMessage, ChatSession
from .redis import cache_message_embedding, search_similar_chunks
from .serializers import ChatMessageSerializer

logger = logging.getLogger(__name__)


def _build_rag_context_block(chunks: list[dict]) -> str:
    if not chunks:
        return 'Данные пользователя: нет проиндексированной финансовой информации.'
    lines = ['Данные пользователя (используй при ответе):']
    for chunk in chunks:
        lines.append(f'- {chunk["text"]}')
    return '\n'.join(lines)


def _compact_rag_context(chunks: list[dict]) -> list[dict]:
    return [
        {
            'chunk_id': chunk['chunk_id'],
            'score': chunk['score'],
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

        rag_chunks = []
        try:
            ensure_user_chunks(user.id)
            rag_chunks = search_similar_chunks(content, user_id=user.id)
        except Exception as exc:
            logger.error('RAG search failed for user %s: %s', user.id, exc)

        base_prompt = session.system_prompt or settings.DEFAULT_SYSTEM_PROMPT
        context_block = _build_rag_context_block(rag_chunks)
        system_prompt = f'{base_prompt}\n\n{context_block}'

        history = ChatMessage.objects.filter(session=session).order_by('created_at')
        messages = [{'role': 'system', 'content': system_prompt}]
        for msg in history:
            messages.append({'role': msg.role, 'content': msg.content})
        messages.append({'role': 'user', 'content': content})

        if not settings.DEEPSEEK_API_KEY:
            return Response({'error': 'LLM API не настроен'}, status=503)

        client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
        )

        try:
            with transaction.atomic():
                user_message = ChatMessage.objects.create(
                    session=session,
                    role='user',
                    content=content,
                )

                try:
                    embedding_key = cache_message_embedding(user_message.id, user.id, content)
                    user_message.embedding_key = embedding_key
                    user_message.save(update_fields=['embedding_key'])
                except Exception as exc:
                    logger.warning('Embedding cache failed: %s', exc)

                response = client.chat.completions.create(
                    model=settings.DEEPSEEK_MODEL,
                    messages=messages,
                    temperature=0.7,
                    stream=False,
                )
                assistant_content = response.choices[0].message.content

                assistant_message = ChatMessage.objects.create(
                    session=session,
                    role='assistant',
                    content=assistant_content,
                    rag_context=_compact_rag_context(rag_chunks),
                )
        except Exception as exc:
            logger.error('DeepSeek API error: %s', exc)
            return Response({'error': 'Ошибка при обращении к нейросети'}, status=502)

        serializer = ChatMessageSerializer(assistant_message)
        return Response(
            {
                **serializer.data,
                'session_id': session.id,
            },
            status=status.HTTP_201_CREATED,
        )
