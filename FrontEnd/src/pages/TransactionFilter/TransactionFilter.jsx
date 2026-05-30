import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import iconArrow from '../../assets/icons/icon_arrow.svg'
import { getBankIcon, isBankIconFullBleed } from '../../lib/constants/bankIconMap.js'
import { formatCurrency } from '../../lib/utils/formatters.js'
import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useFilterStore } from '../../stores/useFilterStore.js'
import { useTransactionsStore } from '../../stores/useTransactionsStore.js'

import styles from './TransactionFilter.module.css'

const CATEGORY_COLORS = [
  '#004385',
  '#033860',
  '#133C55',
  '#33658A',
  '#386FA4',
  '#59A5D8',
  '#05B2DC',
  '#84D2F6',
]

const PERIOD_OPTIONS = [
  { id: 'week', label: 'Неделя', sizeClass: 'periodButtonWeek' },
  { id: 'month', label: 'Месяц', sizeClass: 'periodButtonMonth' },
]

const OPERATION_OPTIONS = [
  { id: 'income', label: 'Пополнения' },
  { id: 'expense', label: 'Переводы' },
]

function normalizeAccountLast4(value) {
  if (!value) return ''
  const digits = String(value).replace(/\D/g, '')
  return digits.slice(-4)
}

function ExpandArrow({ isOpen, className }) {
  return (
    <img
      src={iconArrow}
      className={[className, isOpen ? styles.expandIconOpen : null].filter(Boolean).join(' ')}
      alt=""
      aria-hidden="true"
    />
  )
}

function AccountCard({ product, isSelected, onToggle }) {
  const last4 = normalizeAccountLast4(product.account_number)
  const bankIcon = getBankIcon(product.bank_name)
  const fullBleed = isBankIconFullBleed(product.bank_name)

  return (
    <button
      type="button"
      className={styles.accountCard}
      onClick={() => onToggle(last4)}
      aria-pressed={isSelected}
    >
      <span
        className={[styles.checkbox, isSelected ? styles.checkboxChecked : null]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        {isSelected ? <span className={styles.checkmark} /> : null}
      </span>

      <span className={styles.accountInfo}>
        <span className={styles.accountLabel}>МИР {last4 || '—'}</span>
        <span className={styles.accountAmount}>
          {formatCurrency(product.amount, product.currency_code)}
        </span>
      </span>

      <span
        className={[
          styles.accountIconWrap,
          fullBleed ? styles.accountIconWrapFullBleed : null,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        {bankIcon ? (
          <img
            className={[
              styles.accountIcon,
              fullBleed ? styles.accountIconFullBleed : null,
            ]
              .filter(Boolean)
              .join(' ')}
            src={bankIcon}
            alt=""
          />
        ) : null}
      </span>
    </button>
  )
}

function CardSection({ title, cards, isExpanded, onToggleExpanded, selectedAccountNumbers, onToggleAccount }) {
  if (cards.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </section>
    )
  }

  const hiddenCards = cards.slice(1)
  const hasHiddenCards = hiddenCards.length > 0

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.accountList}>
        <AccountCard
          product={cards[0]}
          isSelected={selectedAccountNumbers.includes(
            normalizeAccountLast4(cards[0].account_number),
          )}
          onToggle={onToggleAccount}
        />

        {hasHiddenCards ? (
          <div
            className={[
              styles.collapsible,
              isExpanded ? styles.collapsibleOpen : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.collapsibleInner}>
              <div className={styles.accountListHidden}>
                {hiddenCards.map((product) => (
                  <AccountCard
                    key={product.id}
                    product={product}
                    isSelected={selectedAccountNumbers.includes(
                      normalizeAccountLast4(product.account_number),
                    )}
                    onToggle={onToggleAccount}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {hasHiddenCards ? (
        <button
          type="button"
          className={styles.expandToggle}
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Свернуть список' : 'Развернуть список'}
        >
          <ExpandArrow
            isOpen={isExpanded}
            className={styles.expandIcon}
          />        </button>
      ) : null}
    </section>
  )
}

export function TransactionFilter() {
  const navigate = useNavigate()

  const [categoriesExpanded, setCategoriesExpanded] = useState(true)
  const [debitCardsExpanded, setDebitCardsExpanded] = useState(false)
  const [creditCardsExpanded, setCreditCardsExpanded] = useState(false)

  const transactions = useTransactionsStore((state) => state.transactions)
  const products = useAccountsStore((state) => state.products)

  const selectedCategories = useFilterStore((state) => state.selectedCategories)
  const periodType = useFilterStore((state) => state.periodType)
  const selectedAccountNumbers = useFilterStore((state) => state.selectedAccountNumbers)
  const selectedOperations = useFilterStore((state) => state.selectedOperations)
  const toggleCategory = useFilterStore((state) => state.toggleCategory)
  const setPeriodType = useFilterStore((state) => state.setPeriodType)
  const toggleAccountNumber = useFilterStore((state) => state.toggleAccountNumber)
  const toggleOperation = useFilterStore((state) => state.toggleOperation)
  const resetFilters = useFilterStore((state) => state.resetFilters)

  const categories = useMemo(() => {
    const names = transactions.map((tx) => tx.category_name).filter(Boolean)
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [transactions])

  const categoryColorIndexMap = useMemo(() => {
    const map = new Map()
    categories.forEach((name, index) => {
      map.set(name, index % CATEGORY_COLORS.length)
    })
    return map
  }, [categories])

  const debitCards = useMemo(
    () => products.filter((product) => product.product_type === 'debit_card'),
    [products],
  )

  const creditCards = useMemo(
    () => products.filter((product) => product.product_type === 'credit_card'),
    [products],
  )

  const categoriesInitRef = useRef(false)

  useEffect(() => {
    if (categories.length === 0) return
    if (categoriesInitRef.current) return

    categoriesInitRef.current = true

    const { selectedCategories: current } = useFilterStore.getState()
    if (current.length === 0) {
      useFilterStore.setState({ selectedCategories: [...categories] })
    }
  }, [categories])

  const handleReset = () => {
    resetFilters()
    if (categories.length > 0) {
      useFilterStore.setState({ selectedCategories: [...categories] })
    }
  }

  const handleApply = () => {
    navigate(-1)
  }

  const handleSelectDates = () => {
    navigate('/transactions/filter/date-picker')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BackButton />
          <h1 className={styles.headerTitle}>Фильтры</h1>
        </div>
      </header>

      <main className={styles.content} aria-label="Настройки фильтров">
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Категории</h2>

          <div
            className={[
              styles.collapsible,
              styles.categoriesCollapsible,
              categoriesExpanded ? styles.categoriesExpanded : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.collapsibleInner}>
              <div className={styles.chipGrid}>
                {categories.map((categoryName) => {
                  const isActive = selectedCategories.includes(categoryName)
                  const colorIndex = categoryColorIndexMap.get(categoryName) ?? 0

                  return (
                    <button
                      key={categoryName}
                      type="button"
                      className={[
                        styles.chip,
                        isActive ? styles.chipActive : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-color-index={colorIndex}
                      aria-pressed={isActive}
                      onClick={() => toggleCategory(categoryName)}
                    >
                      {categoryName}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.expandToggle}
            onClick={() => setCategoriesExpanded((value) => !value)}
            aria-expanded={categoriesExpanded}
            aria-label={categoriesExpanded ? 'Свернуть категории' : 'Развернуть категории'}
          >
            <ExpandArrow isOpen={categoriesExpanded} className={styles.expandIcon} />
          </button>
        </section>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Период</h2>

          <div className={styles.periodRow}>
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={[
                  styles.pillButton,
                  styles[option.sizeClass],
                  periodType === option.id ? styles.pillButtonActive : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={periodType === option.id}
                onClick={() => setPeriodType(option.id)}
              >
                {option.label}
              </button>
            ))}

            <button
              type="button"
              className={[
                styles.pillButton,
                styles.periodButtonDates,
                periodType === 'custom' ? styles.pillButtonActive : null,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={periodType === 'custom'}
              onClick={handleSelectDates}
            >
              Выбрать даты
            </button>
          </div>
        </section>

        <CardSection
          title="Дебетовые карты"
          cards={debitCards}
          isExpanded={debitCardsExpanded}
          onToggleExpanded={() => setDebitCardsExpanded((value) => !value)}
          selectedAccountNumbers={selectedAccountNumbers}
          onToggleAccount={toggleAccountNumber}
        />

        <CardSection
          title="Кредитные карты"
          cards={creditCards}
          isExpanded={creditCardsExpanded}
          onToggleExpanded={() => setCreditCardsExpanded((value) => !value)}
          selectedAccountNumbers={selectedAccountNumbers}
          onToggleAccount={toggleAccountNumber}
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Операции</h2>

          <div className={styles.operationsRow}>
            {OPERATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={[
                  styles.pillButton,
                  selectedOperations.includes(option.id) ? styles.pillButtonActive : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selectedOperations.includes(option.id)}
                onClick={() => toggleOperation(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.actionBar}>
        <button type="button" className={styles.resetButton} onClick={handleReset}>
          Сбросить
        </button>
        <button type="button" className={styles.applyButton} onClick={handleApply}>
          Показать
        </button>
      </footer>
    </div>
  )
}
