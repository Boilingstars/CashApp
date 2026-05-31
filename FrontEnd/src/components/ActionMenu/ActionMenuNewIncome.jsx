import { useEffect, useMemo, useState } from 'react'

import { Check } from 'lucide-react'

import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { GlassSelect } from '../../shared/ui/GlassSelect/GlassSelect.jsx'
import { submitNewIncome } from '../../lib/actionMenu/submitNewIncome.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'

import styles from './ActionMenuForm.module.css'

function formatAmountInput(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ActionMenuNewIncome({ isInteractive = true, onBack, onConfirm }) {
  const products = useAccountsStore((state) => state.products)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

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

  const handleConfirm = async () => {
    if (!isInteractive || isSubmitting) return

    setSubmitError(null)
    setIsSubmitting(true)
    const result = await submitNewIncome({ amount, accountId })
    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    onConfirm?.()
  }

  const isConfirmDisabled =
    !isInteractive || isSubmitting || !amount.replace(/\s/g, '') || !accountId

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

      {submitError ? (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      ) : null}

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
