import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import iconAdd from '../../assets/icons/icon-add.svg'
import iconCopy from '../../assets/icons/icon-copy.svg'
import iconDislike from '../../assets/icons/icon-dislike.svg'
import iconHackcashAi from '../../assets/icons/icon_hackcash_ai.svg'
import iconLike from '../../assets/icons/icon-like.svg'
import iconMenu from '../../assets/icons/icon-menu.svg'
import iconMicrophone from '../../assets/icons/icon_microphone.svg'
import iconSendMessage from '../../assets/icons/icons_send_massage.svg'
import iconShare from '../../assets/icons/icon-share.svg'
import { sendChatMessage } from '../../lib/api/chat.js'
import { quickQuestions } from '../../lib/mocks/chatMocks.js'
import { ChatMarkdown } from '../../lib/utils/formatChatMarkdown.jsx'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'

import styles from './Chat.module.css'

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'ai',
  text: 'Привет! Я Cash Ask — ваш финансовый помощник. Спросите о тратах, балансе или целях.',
  timestamp: new Date().toISOString(),
}

const createMessageId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

async function copyMessageText(text) {
  await navigator.clipboard.writeText(text)
}

async function shareMessageText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
  }

  await copyMessageText(text)
}

function ChatMessage({ message, isActive, onToggleActive }) {
  const isUser = message.role === 'user'

  const handleCopy = () => {
    copyMessageText(message.text).catch(() => {})
  }

  const handleShare = () => {
    shareMessageText(message.text).catch(() => {})
  }

  const handleBubbleClick = () => {
    onToggleActive(message.id)
  }

  const handleBubbleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleBubbleClick()
  }

  return (
    <li
      className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAi} ${isActive ? styles.messageRowActive : ''}`}
      data-message-id={message.id}
    >
      <div className={styles.messageInner}>
        {!isUser && (
          <div className={styles.aiAvatar} aria-hidden="true">
            <img className={styles.aiAvatarIcon} src={iconHackcashAi} alt="" />
          </div>
        )}

        <div className={styles.messageBody}>
          <div
            role="button"
            tabIndex={0}
            className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAi}`}
            onClick={handleBubbleClick}
            onKeyDown={handleBubbleKeyDown}
          >
            {isUser ? message.text : <ChatMarkdown text={message.text} styles={styles} />}
          </div>

          <div className={styles.actions} aria-label="Действия с сообщением">
            <button type="button" className={styles.actionButton} aria-label="Нравится">
              <img className={styles.actionIcon} src={iconLike} alt="" aria-hidden="true" />
            </button>
            <button type="button" className={styles.actionButton} aria-label="Не нравится">
              <img className={styles.actionIcon} src={iconDislike} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.actionButton}
              aria-label="Копировать"
              onClick={handleCopy}
            >
              <img className={styles.actionIcon} src={iconCopy} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.actionButton}
              aria-label="Поделиться"
              onClick={handleShare}
            >
              <img className={styles.actionIcon} src={iconShare} alt="" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isUser && <div className={styles.userAvatar} aria-hidden="true" />}
      </div>
    </li>
  )
}

export function Chat() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialMessageConsumedRef = useRef(false)

  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [activeMessageId, setActiveMessageId] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const messagesScrollRef = useRef(null)

  const scrollMessagesToBottom = useCallback(() => {
    const container = messagesScrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [])

  useEffect(() => {
    scrollMessagesToBottom()
    const frameId = requestAnimationFrame(scrollMessagesToBottom)
    return () => cancelAnimationFrame(frameId)
  }, [messages, scrollMessagesToBottom])

  useEffect(() => {
    if (!activeMessageId) return undefined

    const handlePointerDown = (event) => {
      if (event.target.closest(`.${styles.bubble}`)) return
      if (event.target.closest(`.${styles.actions}`)) return
      setActiveMessageId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeMessageId])

  const handleToggleMessage = (messageId) => {
    setActiveMessageId((current) => (current === messageId ? null : messageId))
  }

  const goToHistory = () => navigate('/chat/history')

  const submitMessage = useCallback(
    async (rawText) => {
      const text = rawText.trim()
      if (!text || isSending) return

      const userMessage = {
        id: createMessageId('user'),
        role: 'user',
        text,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setSendError(null)
      setIsSending(true)

      try {
        const data = await sendChatMessage(text, sessionId)

        if (data?.session_id != null) {
          setSessionId(data.session_id)
        }

        const aiMessage = {
          id: String(data?.id ?? createMessageId('ai')),
          role: 'ai',
          text: data?.content || 'Не удалось получить ответ.',
          timestamp: data?.created_at || new Date().toISOString(),
        }

        setMessages((prev) => [...prev, aiMessage])
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          'Не удалось отправить сообщение'
        setSendError(message)
      } finally {
        setIsSending(false)
      }
    },
    [isSending, sessionId],
  )

  useEffect(() => {
    if (initialMessageConsumedRef.current) return

    const text = location.state?.initialMessage?.trim()
    if (!text) return

    initialMessageConsumedRef.current = true
    navigate('/chat', { replace: true, state: null })
    submitMessage(text)
  }, [location.state, navigate, submitMessage])

  const handleQuickQuestion = (question) => {
    submitMessage(question)
  }

  const handleSend = () => {
    submitMessage(inputValue)
  }

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    handleSend()
  }

  const handleVoice = () => {}

  const handleAddAttachment = () => {}

  const isSendDisabled = isSending || !inputValue.trim()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BackButton />
        <button
          type="button"
          className={styles.historyButton}
          aria-label="История чатов"
          onClick={goToHistory}
        >
          <img className={styles.historyIcon} src={iconMenu} alt="" aria-hidden="true" />
        </button>
        <div className={styles.brandPill} aria-hidden="true">
          Cash Ask
        </div>
      </header>

      <main ref={messagesScrollRef} className={styles.messages} aria-label="Сообщения чата">
        <ul className={styles.messageList}>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isActive={activeMessageId === message.id}
              onToggleActive={handleToggleMessage}
            />
          ))}

          {isSending ? (
            <li className={`${styles.messageRow} ${styles.messageRowAi}`}>
              <div className={styles.messageInner}>
                <div className={styles.aiAvatar} aria-hidden="true">
                  <img className={styles.aiAvatarIcon} src={iconHackcashAi} alt="" />
                </div>
                <div className={styles.messageBody}>
                  <div className={styles.bubble}>Cash Ask печатает…</div>
                </div>
              </div>
            </li>
          ) : null}
        </ul>

        <ul className={styles.quickList} aria-label="Быстрые вопросы">
          {quickQuestions.map((question) => (
            <li key={question} className={styles.quickItem}>
              <button
                type="button"
                className={styles.quickButton}
                disabled={isSending}
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </main>

      <footer className={styles.bottom}>
        <p className={styles.disclaimer}>Нейросеть может допускать ошибки</p>
        {sendError ? (
          <p className={styles.sendError} role="alert">
            {sendError}
          </p>
        ) : null}

        <div className={styles.inputBar} aria-label="Поле ввода сообщения">
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Добавить"
            onClick={handleAddAttachment}
          >
            <img className={styles.iconAdd} src={iconAdd} alt="" aria-hidden="true" />
          </button>

          <input
            className={styles.input}
            type="text"
            value={inputValue}
            disabled={isSending}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Спросите Cash Ask"
            aria-label="Спросите Cash Ask"
          />

          <button
            type="button"
            className={styles.iconButton}
            aria-label="Микрофон"
            onClick={handleVoice}
          >
            <img className={styles.iconMic} src={iconMicrophone} alt="" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.sendButton}
            aria-label="Отправить"
            disabled={isSendDisabled}
            onClick={handleSend}
          >
            <img className={styles.iconSend} src={iconSendMessage} alt="" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  )
}
