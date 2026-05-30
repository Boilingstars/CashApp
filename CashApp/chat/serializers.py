from rest_framework import serializers

from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'session', 'role', 'content', 'rag_context', 'created_at']
        read_only_fields = ['role', 'rag_context', 'created_at']
