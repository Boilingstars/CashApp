import { apiClient } from './axiosInstance.js'

/**
 * POST /chat/message/ — отправка сообщения в Cash Ask.
 * @param {string} content — текст пользователя
 * @param {number | null} sessionId — id сессии (если уже есть)
 */
export async function sendChatMessage(content, sessionId = null) {
  const trimmed = content?.trim()
  if (!trimmed) {
    throw new Error('Сообщение не может быть пустым')
  }

  const payload = { content: trimmed }
  if (sessionId != null) {
    payload.session_id = sessionId
  }

  const { data } = await apiClient.post('/chat/message/', payload)
  return data
}
