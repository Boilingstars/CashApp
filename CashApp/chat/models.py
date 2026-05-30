from django.db import models
from django.conf import settings


class ChatSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_sessions',
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text='Автоматически генерируется по первому вопросу, если не указан',
    )
    system_prompt = models.TextField(
        blank=True,
        help_text='Переопределяет глобальный системный промпт для этой сессии',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Сессия чата'
        verbose_name_plural = 'Сессии чата'

    def __str__(self):
        return f'{self.user} - {self.title or self.id}'


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'Пользователь'),
        ('assistant', 'Ассистент'),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
    )
    content = models.TextField()

    rag_context = models.JSONField(
        null=True,
        blank=True,
        help_text='Массив объектов {chunk_id, score, text_snippet}',
    )

    embedding_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Ключ в Redis, по которому лежит эмбеддинг этого сообщения',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'

    def __str__(self):
        return f'{self.role}: {self.content[:50]}'

    @property
    def cache_key(self):
        import hashlib
        import json

        payload = {
            'content': self.content,
            'session_id': self.session_id,
            'rag_context': self.rag_context,
            'system_prompt': self.session.system_prompt,
            'model': settings.LLM_CHAT_MODEL,
        }
        hash_str = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return f'llm_response:{hash_str}'
