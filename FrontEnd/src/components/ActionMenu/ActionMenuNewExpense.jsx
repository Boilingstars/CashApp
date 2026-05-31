import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Check, ChevronRight } from 'lucide-react'

import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { GlassSelect } from '../../shared/ui/GlassSelect/GlassSelect.jsx'
import { filterExpenseCategories } from '../../lib/utils/filterExpenseCategories.js'
import { formatExpenseDateDisplay } from '../../lib/utils/formatExpenseDate.js'
import { mapReferenceToSelectOptions } from '../../lib/utils/mapReferenceToSelectOptions.js'
import { submitNewExpense } from '../../lib/actionMenu/submitNewExpense.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'
import { useReferenceStore } from '../../stores/useReferenceStore.js'

import styles from './ActionMenuForm.module.css'

function formatAmountInput(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function ActionMenuNewExpense({ isInteractive = true, onBack }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const products = useAccountsStore((state) => state.products)
  const draft = useActionMenuStore((state) => state.newExpenseDraft)
  const patchNewExpenseDraft = useActionMenuStore((state) => state.patchNewExpenseDraft)
  const openExpenseDatePicker = useActionMenuStore((state) => state.openExpenseDatePicker)

  // TEMP: useReferenceStore — см. stores/useReferenceStore.js; позже можно локальный fetch
  const referenceCategories = useReferenceStore((state) => state.categories)
  const referenceServices = useReferenceStore((state) => state.services)
  const fetchReference = useReferenceStore((state) => state.fetchReference)

  useEffect(() => {
    fetchReference()
  }, [fetchReference])

  // TEMP: value = name через mapReferenceToSelectOptions; категории — filterExpenseCategories
  const categoryOptions = useMemo(
    () => mapReferenceToSelectOptions(filterExpenseCategories(referenceCategories)),
    [referenceCategories],
  )

  const serviceOptions = useMemo(
    () => mapReferenceToSelectOptions(referenceServices),
    [referenceServices],
  )

  useEffect(() => {
    if (!draft || draft.categoryName || !categoryOptions.length) return
    patchNewExpenseDraft({ categoryName: categoryOptions[0].value })
  }, [categoryOptions, draft, patchNewExpenseDraft])

  useEffect(() => {
    if (!draft || draft.accountId || !products.length) return
    patchNewExpenseDraft({ accountId: products[0].id })
  }, [draft, patchNewExpenseDraft, products])

  useEffect(() => {
    if (!draft || draft.customServiceName || !serviceOptions.length) return
    patchNewExpenseDraft({ customServiceName: serviceOptions[0].value })
  }, [draft, patchNewExpenseDraft, serviceOptions])

  const accountOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.custom_name || product.bank_name,
      })),
    [products],
  )

  if (!draft) {
    return null
  }

  const { step, amount, categoryName, accountId, customServiceName, cashback, date } = draft
  const dateDisplay = formatExpenseDateDisplay(date)

  const handleAmountChange = (event) => {
    patchNewExpenseDraft({ amount: formatAmountInput(event.target.value) })
  }

  const handleCashbackChange = (event) => {
    patchNewExpenseDraft({ cashback: formatAmountInput(event.target.value) })
  }

  const handleHeaderBack = () => {
    if (step === 'meta') {
      patchNewExpenseDraft({ step: 'details' })
      return
    }
    onBack?.()
  }

  const handleNext = () => {
    if (!isInteractive) return
    const numericAmount = Number(amount.replace(/\s/g, ''))
    if (!categoryName || !numericAmount || numericAmount <= 0) return
    patchNewExpenseDraft({ step: 'meta' })
  }

  const handleOpenDatePicker = () => {
    if (!isInteractive) return
    openExpenseDatePicker(pathname)
    navigate('/transactions/filter/date-picker?from=newExpense')
  }

  const handleConfirm = async () => {
    if (!isInteractive || isSubmitting) return
    setSubmitError(null)
    setIsSubmitting(true)
    const result = await submitNewExpense()
    setIsSubmitting(false)
    if (!result.ok) {
      setSubmitError(result.error)
    }
  }

  const isNextDisabled = !isInteractive || isSubmitting || !amount.replace(/\s/g, '') || !categoryName
  const isConfirmDisabled =
    !isInteractive ||
    isSubmitting ||
    !amount.replace(/\s/g, '') ||
    !accountId ||
    !customServiceName ||
    !date

  if (step === 'meta') {
    return (
      <div className={styles.rootStepMeta}>
        <header className={styles.header}>
          <BackButton variant="card" onClick={handleHeaderBack} />
          <h2 className={styles.title}>Новая трата</h2>
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

        {submitError ? (
          <p className={styles.submitError} role="alert">
            {submitError}
          </p>
        ) : null}

        <div className={styles.metaGrid}>
          <p className={styles.metaLabel}>Счет</p>
          <p className={styles.metaLabel}>Кешбэк</p>

          <div className={styles.metaFieldWide}>
            <GlassSelect
              size="compact"
              value={accountId}
              onChange={(value) => patchNewExpenseDraft({ accountId: value })}
              options={accountOptions}
              ariaLabel="Выбор счёта"
            />
          </div>
          <input
            type="text"
            inputMode="numeric"
            className={styles.metaInputNarrow}
            value={cashback}
            placeholder="1000 ₽"
            aria-label="Кешбэк"
            disabled={!isInteractive}
            onChange={handleCashbackChange}
          />

          <p className={styles.metaLabel}>Магазин</p>
          <p className={styles.metaLabel}>Дата</p>

          <div className={styles.metaFieldWide}>
            <GlassSelect
              size="compact"
              value={customServiceName}
              onChange={(value) => patchNewExpenseDraft({ customServiceName: value })}
              options={serviceOptions}
              ariaLabel="Выбор магазина"
            />
          </div>
          <button
            type="button"
            className={[
              styles.metaInputNarrow,
              styles.metaDateButton,
              !dateDisplay ? styles.metaDateButtonEmpty : null,
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={!isInteractive}
            aria-label="Выбрать дату траты"
            onClick={handleOpenDatePicker}
          >
            {dateDisplay || '13:00, 29.05'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <BackButton variant="card" onClick={handleHeaderBack} />
        <h2 className={styles.title}>Новая трата</h2>
        <button
          type="button"
          className={styles.confirmButton}
          aria-label="Далее"
          disabled={isNextDisabled}
          onClick={handleNext}
        >
          <ChevronRight className={styles.nextIcon} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.amountSection}>
        {!amount ? <span className={styles.amountPlaceholder}>Сумма</span> : null}
        <input
          type="text"
          inputMode="numeric"
          className={styles.amountInput}
          value={amount}
          aria-label="Сумма траты"
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
        <p className={styles.fieldLabel}>Категория</p>
        <div className={styles.fieldSelectWrap}>
          <GlassSelect
            value={categoryName}
            onChange={(value) => patchNewExpenseDraft({ categoryName: value })}
            options={categoryOptions}
            ariaLabel="Категория траты"
          />
        </div>
      </div>
    </div>
  )
}
