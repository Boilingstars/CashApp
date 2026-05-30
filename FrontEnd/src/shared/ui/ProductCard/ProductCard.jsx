import { useNavigate } from 'react-router-dom'

import { getBankIcon, isBankIconFullBleed } from '../../../lib/constants/bankIconMap.js'

import styles from './ProductCard.module.css'

const formatMoney = (amount, currencyCode) => {
  const code = currencyCode || 'RUB'

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    const n = Number(amount) || 0
    const suffix = code === 'RUB' ? ' ₽' : ` ${code}`
    return `${n.toLocaleString('ru-RU')}${suffix}`
  }
}

export function ProductCard({ product, badge, interactive = true }) {
  const navigate = useNavigate()
  const name = product?.custom_name || product?.bank_name || '—'
  const amount = Number(product?.amount) || 0
  const formatted = formatMoney(amount, product?.currency_code)
  const bankIcon = getBankIcon(product?.bank_name)
  const fullBleed = isBankIconFullBleed(product?.bank_name)

  const trailingClassName = [styles.trailing, fullBleed ? styles.trailingFullBleed : '']
    .filter(Boolean)
    .join(' ')

  const bankIconClassName = [styles.bankIcon, fullBleed ? styles.bankIconFullBleed : '']
    .filter(Boolean)
    .join(' ')

  const handleClick = () => {
    if (product?.id) navigate(`/products/${product.id}`)
  }

  const content = (
    <>
      <div className={styles.content}>
        <div className={styles.title}>{name}</div>
        <div className={styles.bottomRow}>
          <span className={styles.amountWrap}>
            <span className={styles.amount}>{formatted}</span>
            {badge ? <span className={styles.badge}>{badge}</span> : null}
          </span>
        </div>
      </div>

      <div className={trailingClassName} aria-hidden="true">
        {bankIcon ? <img className={bankIconClassName} src={bankIcon} alt="" /> : null}
      </div>
    </>
  )

  if (!interactive) {
    return (
      <div className={styles.rootStatic} aria-label={name}>
        {content}
      </div>
    )
  }

  return (
    <button type="button" className={styles.root} aria-label={name} onClick={handleClick}>
      {content}
    </button>
  )
}
