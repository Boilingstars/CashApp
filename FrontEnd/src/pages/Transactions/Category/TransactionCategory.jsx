import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import iconMenu from '../../../assets/icons/icon-menu.svg'
import {
  applyTransactionFilters,
  decodeCategoryRouteParam,
  filterTransactionsByCategory,
} from '../../../lib/utils/calcTransactionStats.js'
import { formatCurrency } from '../../../lib/utils/formatters.js'
import { useDragScroll } from '../../../lib/hooks/useDragScroll.js'
import { useFilterStore } from '../../../stores/useFilterStore.js'
import { useTransactionsStore } from '../../../stores/useTransactionsStore.js'
import { BackButton } from '../../../shared/ui/BackButton/BackButton.jsx'
import { Chip } from '../../../shared/ui/Chip/Chip.jsx'
import { TransactionItem } from '../../../shared/ui/TransactionItem/TransactionItem.jsx'

import styles from './TransactionCategory.module.css'

/** TEMP: визуальные фильтры; логика и dropdown «Даты» — позже */
const FILTER_CHIPS = [
  { id: 'accounts', label: 'Счета и карты', kind: 'chip' },
  { id: 'dates', label: 'Даты', kind: 'dropdown' },
  { id: 'topups', label: 'Пополнения', kind: 'chip' },
  { id: 'transfers', label: 'Переводы', kind: 'chip' },
  { id: 'all', label: 'Всё', kind: 'chip' },
]

export function TransactionCategory() {
  const { categoryKey } = useParams()
  const [activeChipId, setActiveChipId] = useState('all')
  const { scrollerRef, isDragging, dragHandlers } = useDragScroll({ threshold: 8 })

  const transactions = useTransactionsStore((s) => s.transactions)
  const operationType = useTransactionsStore((s) => s.operationType)

  const periodType = useFilterStore((s) => s.periodType)
  const customDateRange = useFilterStore((s) => s.customDateRange)
  const selectedAccountNumbers = useFilterStore((s) => s.selectedAccountNumbers)
  const selectedOperations = useFilterStore((s) => s.selectedOperations)

  const categoryName = useMemo(
    () => decodeCategoryRouteParam(categoryKey),
    [categoryKey],
  )

  const categoryTransactions = useMemo(() => {
    const byCategory = filterTransactionsByCategory(
      transactions,
      categoryName,
      operationType,
    )

    return applyTransactionFilters(
      byCategory,
      {
        periodType,
        customDateRange,
        selectedAccountNumbers,
        selectedOperations,
      },
      { skipCategoryFilter: true },
    ).sort((a, b) => new Date(b.operation_date) - new Date(a.operation_date))
  }, [
    transactions,
    categoryName,
    operationType,
    periodType,
    customDateRange,
    selectedAccountNumbers,
    selectedOperations,
  ])

  const totalAmount = useMemo(
    () =>
      categoryTransactions.reduce(
        (sum, tx) => sum + (Number(tx.amount) || 0),
        0,
      ),
    [categoryTransactions],
  )

  const pageTitle = categoryName
    ? `Категория ${categoryName.toLowerCase()}`
    : 'Категория'

  const handleChipSelect = (chipId) => {
    setActiveChipId(chipId)
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-label={pageTitle}>
        <BackButton variant="card" />
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{pageTitle}</h1>
          <p className={styles.heroAmount}>{formatCurrency(totalAmount)}</p>
        </div>
      </section>

      <div className={styles.chipToolbar}>
        <div
          ref={scrollerRef}
          className={[
            styles.chipScroller,
            isDragging ? styles.chipScrollerDragging : null,
          ]
            .filter(Boolean)
            .join(' ')}
          role="tablist"
          aria-label="Фильтры категории"
          {...dragHandlers}
        >
          <Link
            to="/transactions/filter"
            className={styles.filterChip}
            aria-label="Фильтры операций"
          >
            <img className={styles.filterIcon} src={iconMenu} alt="" aria-hidden="true" />
          </Link>

          {FILTER_CHIPS.map((chip) => {
            const isActive = activeChipId === chip.id

            if (chip.kind === 'dropdown') {
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={[
                    styles.dropdownChip,
                    isActive ? styles.chipActive : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="tab"
                  aria-selected={isActive}
                  aria-haspopup="listbox"
                  aria-expanded={false}
                  onClick={() => handleChipSelect(chip.id)}
                >
                  <span>{chip.label}</span>
                  <ChevronDown className={styles.dropdownChevron} aria-hidden="true" />
                </button>
              )
            }

            return (
              <Chip
                key={chip.id}
                variant="pill"
                size="md"
                active={isActive}
                className={isActive ? styles.chipActive : undefined}
                aria-pressed={isActive}
                onClick={() => handleChipSelect(chip.id)}
              >
                {chip.label}
              </Chip>
            )
          })}
        </div>
      </div>

      <main className={styles.main}>
        {categoryTransactions.length === 0 ? (
          <p className={styles.empty}>Нет операций в этой категории</p>
        ) : (
          <ul className={styles.list}>
            {categoryTransactions.map((tx) => (
              <li key={tx.id}>
                <TransactionItem
                  serviceName={tx.service_name}
                  customServiceName={tx.custom_service_name}
                  categoryName={tx.category_name}
                  currencyCode={tx.currency_code}
                  amount={tx.amount}
                  operation={tx.operation}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
