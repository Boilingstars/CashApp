import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import iconMenu from '../../../assets/icons/icon-menu.svg'
import iconArrowRight from '../../../assets/icons/icon_arrow_right.svg'
import iconHackcashAi from '../../../assets/icons/icon_hackcash_ai.svg'
import {
  applyTransactionFilters,
  calcTransactionStats,
  getCategoryRoutePath,
} from '../../../lib/utils/calcTransactionStats.js'
import { useFilterStore } from '../../../stores/useFilterStore.js'
import { useTransactionsStore } from '../../../stores/useTransactionsStore.js'
import { BackButton } from '../../../shared/ui/BackButton/BackButton.jsx'
import { DonutChartCard } from '../../../shared/ui/DonutChartCard/DonutChartCard.jsx'
import { CategorySummaryCard } from '../../../shared/ui/CategorySummaryCard/CategorySummaryCard.jsx'

import styles from './TransactionStats.module.css'

const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export function TransactionStats() {
  const navigate = useNavigate()

  const transactions = useTransactionsStore((s) => s.transactions)
  const operationType = useTransactionsStore((s) => s.operationType)
  const setOperationType = useTransactionsStore((s) => s.setOperationType)

  const selectedCategories = useFilterStore((s) => s.selectedCategories)
  const periodType = useFilterStore((s) => s.periodType)
  const customDateRange = useFilterStore((s) => s.customDateRange)
  const selectedAccountNumbers = useFilterStore((s) => s.selectedAccountNumbers)
  const selectedOperations = useFilterStore((s) => s.selectedOperations)

  const filteredTransactions = useMemo(
    () =>
      applyTransactionFilters(transactions, {
        selectedCategories,
        periodType,
        customDateRange,
        selectedAccountNumbers,
        selectedOperations,
      }),
    [
      transactions,
      selectedCategories,
      periodType,
      customDateRange,
      selectedAccountNumbers,
      selectedOperations,
    ],
  )

  const stats = useMemo(
    () => calcTransactionStats(filteredTransactions, operationType),
    [filteredTransactions, operationType],
  )

  const monthLabel = MONTH_LABELS[new Date().getMonth()]
  const donutTitle = operationType === 'expense' ? 'Мои траты' : 'Мои доходы'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <BackButton />
        </div>

        <div className={styles.toolbar} role="toolbar" aria-label="Фильтры и тип операций">
          <Link
            to="/transactions/filter"
            className={styles.filterButton}
            aria-label="Фильтры операций"
          >
            <img className={styles.filterIcon} src={iconMenu} alt="" aria-hidden="true" />
          </Link>

          <div className={styles.typeToggle} role="radiogroup" aria-label="Тип операций">
            <button
              type="button"
              role="radio"
              aria-checked={operationType === 'expense'}
              className={[
                styles.typeButton,
                operationType === 'expense' ? styles.typeButtonActive : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setOperationType('expense')}
            >
              Расходы
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={operationType === 'income'}
              className={[
                styles.typeButton,
                styles.typeButtonIncome,
                operationType === 'income' ? styles.typeButtonActive : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setOperationType('income')}
            >
              Доходы
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.donutSection} aria-label={donutTitle}>
          <DonutChartCard
            title={donutTitle}
            data={stats.chartData}
            totalAmount={stats.totalAmount}
            monthLabel={monthLabel}
          />
        </section>

        <button
          type="button"
          className={styles.planCard}
          onClick={() => navigate('/chat')}
        >
          <span className={styles.planIconWrap} aria-hidden="true">
            <img className={styles.planIcon} src={iconHackcashAi} alt="" />
          </span>
          <span className={styles.planText}>Поможем спланировать расходы на месяц</span>
          <img className={styles.planArrow} src={iconArrowRight} alt="" aria-hidden="true" />
        </button>

        <section className={styles.summarySection} aria-labelledby="summary-heading">
          <h2 id="summary-heading" className={styles.sectionTitle}>
            В этом месяце
          </h2>
          <div className={styles.summaryList}>
            {stats.summaryData.map((category) => (
              <CategorySummaryCard
                key={category.category_name}
                category={category}
                onClick={() =>
                  navigate(getCategoryRoutePath(category.category_name))
                }
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
