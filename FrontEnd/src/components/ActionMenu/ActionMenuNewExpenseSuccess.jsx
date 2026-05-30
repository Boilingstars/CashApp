import { useEffect, useState } from 'react'

import { Check } from 'lucide-react'

import styles from './ActionMenuNewExpenseSuccess.module.css'

const AUTO_CLOSE_SECONDS = 3

export function ActionMenuNewExpenseSuccess({ isInteractive = true, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS)

  useEffect(() => {
    if (!isInteractive) return undefined

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isInteractive])

  useEffect(() => {
    if (!isInteractive || secondsLeft > 0) return
    onClose?.()
  }, [isInteractive, onClose, secondsLeft])

  return (
    <div className={styles.root}>
      <p className={styles.countdown} aria-live="polite">
        {secondsLeft} сек...
      </p>

      <div className={styles.successRow}>
        <span className={styles.checkBadge} aria-hidden="true">
          <Check className={styles.checkIcon} />
        </span>
        <h2 className={styles.title}>Успешно</h2>
      </div>

      <button
        type="button"
        className={styles.templateLink}
        disabled={!isInteractive}
        onClick={() => {
          /* TEMP: сохранение шаблона */
        }}
      >
        Сохранить шаблон?
      </button>
    </div>
  )
}
