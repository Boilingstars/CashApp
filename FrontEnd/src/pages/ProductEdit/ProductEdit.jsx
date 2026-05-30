import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { saveProduct, deleteProduct } from '../../lib/api/products.js'
import { BANK_OPTIONS, CURRENCY_OPTIONS } from '../../lib/constants/productEditOptions.js'
import { getProductTypeTitle } from '../../lib/constants/productTypeTitleMap.js'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { GlassSelect } from '../../shared/ui/GlassSelect/GlassSelect.jsx'
import { ProductCard } from '../../shared/ui/ProductCard/ProductCard.jsx'
import { useAccountsStore } from '../../stores/useAccountsStore.js'

import { DeleteButton } from './DeleteButton.jsx'
import styles from './ProductEdit.module.css'

const ACCOUNT_NUMBER_RE = /^\d{4}$/

const isCardProduct = (productType) =>
  productType === 'debit_card' || productType === 'credit_card'

const createFormStateFromProduct = (product) => ({
  amount: Number(product.amount) || 0,
  custom_name: product.custom_name || '',
  currency_code: product.currency_code || 'RUB',
  bank_name: product.bank_name || '',
  account_number: product.account_number || '',
})

const toStoredAmount = (rawValue, productType) => {
  const n = Math.abs(Number(rawValue) || 0)
  return productType === 'credit_card' ? -n : n
}

const buildSavePayload = (product, formState) => {
  const payload = {
    ...product,
    amount: toStoredAmount(formState.amount, product.product_type),
    custom_name: formState.custom_name.trim(),
    currency_code: formState.currency_code,
    bank_name: formState.bank_name,
    updated_at: new Date().toISOString(),
  }

  if (isCardProduct(product.product_type)) {
    payload.account_number = formState.account_number
  }

  return payload
}

function ProductEditForm({ product }) {
  const navigate = useNavigate()
  const [formState, setFormState] = useState(() => createFormStateFromProduct(product))
  const [accountNumberError, setAccountNumberError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isCard = isCardProduct(product.product_type)
  const headerTitle = getProductTypeTitle(product.product_type)

  const currencyOptions = useMemo(
    () => CURRENCY_OPTIONS.map((code) => ({ value: code, label: code })),
    [],
  )

  const bankOptions = useMemo(() => BANK_OPTIONS, [])

  const previewProduct = {
    ...product,
    ...formState,
    amount: toStoredAmount(formState.amount, product.product_type),
  }

  const balanceInputValue =
    formState.amount === 0 || formState.amount === -0
      ? ''
      : String(Math.abs(Number(formState.amount) || 0))

  const handleBack = async () => {
    if (isSaving || isDeleting) return

    if (isCard && !ACCOUNT_NUMBER_RE.test(formState.account_number)) {
      setAccountNumberError('Введите ровно 4 цифры')
      return
    }

    setIsSaving(true)
    try {
      await saveProduct(buildSavePayload(product, formState))
      navigate(-1)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isSaving || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteProduct(product.id)
      navigate('/accounts')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBalanceChange = (event) => {
    const { value } = event.target
    if (value === '') {
      setFormState((prev) => ({ ...prev, amount: 0 }))
      return
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed)) return

    setFormState((prev) => ({
      ...prev,
      amount: toStoredAmount(parsed, product.product_type),
    }))
  }

  const handleAccountNumberChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    setAccountNumberError('')
    setFormState((prev) => ({ ...prev, account_number: digits }))
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BackButton onClick={handleBack} />
          <h1 className={styles.headerTitle}>{headerTitle}</h1>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section} aria-label="Предпросмотр">
          <h2 className={styles.sectionTitle}>Предпросмотр</h2>
          <ProductCard product={previewProduct} interactive={false} />
        </section>

        <section className={styles.field} aria-label="Изменить имя">
          <h2 className={styles.sectionTitle}>Изменить имя</h2>
          <input
            className={styles.input}
            type="text"
            value={formState.custom_name}
            maxLength={24}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, custom_name: event.target.value }))
            }
          />
        </section>

        <section className={styles.field} aria-label="Новый баланс">
          <h2 className={styles.sectionTitle}>Новый баланс</h2>
          <input
            className={`${styles.input} ${styles.inputNumber}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="Введите новый баланс"
            value={balanceInputValue}
            onChange={handleBalanceChange}
          />
        </section>

        <div className={styles.fieldRow} aria-label="Валюта и банк">
          <div className={styles.fieldCol}>
            <h2 className={styles.fieldColTitle}>Валюта</h2>
            <GlassSelect
              ariaLabel="Валюта"
              value={formState.currency_code}
              options={currencyOptions}
              onChange={(currency_code) => setFormState((prev) => ({ ...prev, currency_code }))}
            />
          </div>

          <div className={styles.fieldCol}>
            <h2 className={styles.fieldColTitle}>Банк</h2>
            <GlassSelect
              ariaLabel="Банк"
              value={formState.bank_name}
              options={bankOptions}
              onChange={(bank_name) => setFormState((prev) => ({ ...prev, bank_name }))}
            />
          </div>
        </div>

        {isCard ? (
          <section className={styles.field} aria-label="Номер карты">
            <h2 className={styles.sectionTitle}>Номер карты</h2>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              value={formState.account_number}
              onChange={handleAccountNumberChange}
            />
            {accountNumberError ? (
              <p className={styles.fieldError} role="alert">
                {accountNumberError}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className={styles.deleteWrap}>
          <DeleteButton onClick={handleDelete} disabled={isSaving || isDeleting} />
        </div>
      </div>
    </div>
  )
}

export function ProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const products = useAccountsStore((s) => s.products)

  const product = useMemo(() => products.find((p) => p.id === id), [products, id])

  if (!product) {
    return (
      <div className={styles.notFound}>
        <h1 className={styles.notFoundTitle}>Продукт не найден</h1>
        <p className={styles.notFoundText}>Карточка с id «{id}» отсутствует в списке продуктов.</p>
        <button type="button" className={styles.notFoundLink} onClick={() => navigate('/accounts')}>
          Назад к счетам
        </button>
      </div>
    )
  }

  return <ProductEditForm key={product.id} product={product} />
}
