import { useEffect, useMemo, useState } from 'react'

import { Check } from 'lucide-react'

import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { GlassSelect } from '../../shared/ui/GlassSelect/GlassSelect.jsx'
import { useAccountsStore } from '../../stores/useAccountsStore.js'

import styles from './ActionMenuForm.module.css'

function formatAmountInput(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ActionMenuNewIncome({ isInteractive = true, onBack, onConfirm }) {
  const products = useAccountsStore((state) => state.products)
  const updateProduct = useAccountsStore((state) => state.updateProduct)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (accountId || !products.length) return
    setAccountId(products[0].id)
  }, [accountId, products])

  const accountOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.custom_name || product.bank_name,
      })),
    [products],
  )

  const handleAmountChange = (event) => {
    setAmount(formatAmountInput(event.target.value))
  }

  const handleConfirm = () => {
    if (!isInteractive) return

    const numericAmount = Number(amount.replace(/\s/g, ''))
    if (!accountId || !numericAmount || numericAmount <= 0) return

    const product = products.find((item) => item.id === accountId)
    if (!product) return

    updateProduct({
      id: accountId,
      amount: (Number(product.amount) || 0) + numericAmount,
    })

    onConfirm?.()
  }

  const isConfirmDisabled = !isInteractive || !amount.replace(/\s/g, '')

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <BackButton variant="card" onClick={onBack} />
        <h2 className={styles.title}>Новое поступление</h2>
        <button
          type="button"
          className={styles.confirmButton}
          aria-label="Подтвердить"
          disabled={isConfirmDisabled}
          onClick={handleConfirm}
        >
          <Check className={styles.confirmIcon} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.amountSection}>
        {!amount ? <span className={styles.amountPlaceholder}>Сумма</span> : null}
        <input
          type="text"
          inputMode="numeric"
          className={styles.amountInput}
          value={amount}
          aria-label="Сумма поступления"
          disabled={!isInteractive}
          onChange={handleAmountChange}
        />
      </div>

      <div className={styles.fieldSection}>
        <p className={styles.fieldLabel}>Счет</p>
        <div className={styles.fieldSelectWrap}>
          <GlassSelect
            value={accountId}
            onChange={setAccountId}
            options={accountOptions}
            ariaLabel="Выбор счёта"
          />
        </div>
      </div>
    </div>
  )
}
