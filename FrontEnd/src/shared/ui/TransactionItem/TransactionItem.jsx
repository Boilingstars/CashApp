import {
  formatCurrency,
  formatTransactionTitle,
} from '../../../lib/utils/formatters.js'

import styles from './TransactionItem.module.css'

export function TransactionItem({
  serviceName,
  customServiceName,
  categoryName,
  currencyCode = 'RUB',
  amount,
  operation,
  operationDate,
  accountNumber,
}) {
  const title = formatTransactionTitle(serviceName, customServiceName)
  const formatted = formatCurrency(amount, currencyCode)
  const isIncome = operation === 'income'
  const signedAmount = `${isIncome ? '+' : '-'}${formatted}`

  return (
    <article
      className={styles.root}
      aria-label={title}
      data-operation-date={operationDate}
      data-account={accountNumber}
    >
      <div className={styles.iconPlaceholder} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{categoryName}</p>
      </div>

      <div className={styles.amountCol}>
        <p className={styles.amount}>{signedAmount}</p>
        <p className={styles.meta} aria-hidden="true">
          &nbsp;
        </p>
      </div>
    </article>
  )
}
