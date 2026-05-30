import { getDaysUntilDate } from '../../../lib/utils/paymentUtils.js'
import { formatCurrency } from '../../../lib/utils/formatters.js'

import styles from './PaymentCard.module.css'

const isLightBackground = (bgColor) => {
  if (!bgColor) return false
  const value = String(bgColor).toLowerCase()
  return (
    value === '#ffffff' ||
    value === '#fff' ||
    value.includes('surface') ||
    value.includes('var(--color-surface)')
  )
}

const formatDaysLabel = (days) => {
  const n = Math.abs(Number(days) || 0)
  const mod10 = n % 10
  const mod100 = n % 100

  if (mod100 >= 11 && mod100 <= 14) return `через ${n} дней`
  if (mod10 === 1) return `через ${n} день`
  if (mod10 >= 2 && mod10 <= 4) return `через ${n} дня`
  return `через ${n} дней`
}

export function PaymentCard({
  serviceName,
  currencyCode = 'RUB',
  amount,
  customName,
  nextPaymentDate,
  bgColor,
  onMenuClick,
}) {
  const daysUntil = getDaysUntilDate(nextPaymentDate)
  const formattedAmount = formatCurrency(amount, currencyCode)
  const light = isLightBackground(bgColor)

  const rootClassName = [styles.root, light ? styles.rootLight : styles.rootDark]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={rootClassName}
      style={{ background: bgColor }}
      aria-label={customName || serviceName}
    >
      <div className={styles.topRow}>
        <div className={styles.iconPlaceholder} aria-hidden="true" />
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Меню платежа"
          onClick={() => onMenuClick?.()}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <span className={styles.menuDot} />
            <span className={styles.menuDot} />
            <span className={styles.menuDot} />
          </span>
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.title}>{customName}</p>
        <p className={styles.amount}>{formattedAmount}</p>
        <p className={styles.daysLabel}>{formatDaysLabel(daysUntil)}</p>
      </div>
    </article>
  )
}
