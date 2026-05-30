import iconCalendar from '../../../assets/icons/icon_calendar.svg'
import { formatCurrency } from '../../../lib/utils/formatters.js'

import styles from './MonthlySpendingCard.module.css'

export function MonthlySpendingCard({ amount, currencyCode = 'RUB', onCalendarClick }) {
  const formattedAmount = formatCurrency(amount, currencyCode)

  return (
    <section className={styles.root} aria-label="Траты в этом месяце">
      <div className={styles.content}>
        <p className={styles.label}>Траты в этом месяце</p>
        <p className={styles.amount}>{formattedAmount}</p>
      </div>

      <button
        type="button"
        className={styles.calendarButton}
        aria-label="Открыть календарь"
        onClick={() => onCalendarClick?.()}
      >
        <img className={styles.calendarIcon} src={iconCalendar} alt="" aria-hidden="true" />
      </button>
    </section>
  )
}
