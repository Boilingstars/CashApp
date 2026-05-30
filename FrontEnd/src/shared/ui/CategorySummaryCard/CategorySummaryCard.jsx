import { formatCurrency } from '../../../lib/utils/formatters.js'

import styles from './CategorySummaryCard.module.css'

export function CategorySummaryCard({ category, onClick }) {
  const name = category?.category_name ?? ''
  const count = Number(category?.count) || 0
  const percent = category?.percent ?? 0
  const formattedAmount = formatCurrency(category?.totalAmount)

  return (
    <button type="button" className={styles.root} aria-label={name} onClick={onClick}>
      <div className={styles.iconPlaceholder} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.title}>{name}</p>
        <p className={styles.subtitle}>{count} операций</p>
      </div>

      <div className={styles.amountCol}>
        <p className={styles.amount}>{formattedAmount}</p>
        <p className={styles.meta}>{percent}%</p>
      </div>
    </button>
  )
}
