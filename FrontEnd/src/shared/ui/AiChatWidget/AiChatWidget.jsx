import { useCallback, useState } from 'react'

import { Chip } from '../Chip/Chip.jsx'

import iconAdd from '../../../assets/icons/icon-add.svg'
import iconMicrophone from '../../../assets/icons/icon_microphone.svg'
import iconSendMessage from '../../../assets/icons/icons_send_massage.svg'

import styles from './AiChatWidget.module.css'

export function AiChatWidget({
  onGoToChat,
  onSubmit,
  placeholder = 'Какой у вас вопрос',
  className,
}) {
  const [value, setValue] = useState('')

  const submit = useCallback(() => {
    const cb = onSubmit || onGoToChat
    cb?.(value)
  }, [onSubmit, onGoToChat, value])

  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    submit()
  }

  return (
    <section className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.goToChatWrap}>
        <Chip onClick={() => onGoToChat?.()} size="lg" variant="pill">
          Перейти в чат
        </Chip>
      </div>

      <div className={styles.inputBar}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Добавить"
        >
          <img className={styles.iconAdd} alt="" src={iconAdd} />
        </button>

        <input
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Вопрос для Cash Ask"
        />

        <button
          type="button"
          className={styles.iconButton}
          aria-label="Микрофон"
        >
          <img className={styles.iconMic} alt="" src={iconMicrophone} />
        </button>

        <button
          type="button"
          className={styles.sendButton}
          aria-label="Отправить"
          onClick={submit}
        >
          <img className={styles.sendIcon} alt="" src={iconSendMessage} />
        </button>
      </div>
    </section>
  )
}
