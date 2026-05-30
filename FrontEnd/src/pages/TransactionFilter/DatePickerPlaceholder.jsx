import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BackButton } from '../../shared/ui/BackButton/BackButton.jsx'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'
import { useFilterStore } from '../../stores/useFilterStore.js'

import styles from './DatePickerPlaceholder.module.css'

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTH_NAMES = [
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

const MONTHS_BACK = 11
const MONTHS_FORWARD = 1

const toDateKey = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayPart = String(day).padStart(2, '0')
  return `${year}-${month}-${dayPart}`
}

const buildMonthList = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + MONTHS_FORWARD, 1)
  const months = []

  const cursor = new Date(start)
  while (cursor <= end) {
    months.push({
      year: cursor.getFullYear(),
      monthIndex: cursor.getMonth(),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

const readInitialSelectedDates = (isExpenseMode) => {
  if (isExpenseMode) {
    const date = useActionMenuStore.getState().newExpenseDraft?.date
    return date ? [date] : []
  }

  const { periodType, customDateRange } = useFilterStore.getState()
  if (periodType !== 'custom') return []

  const dates = []
  if (customDateRange?.from) dates.push(customDateRange.from)
  if (customDateRange?.to && customDateRange.to !== customDateRange.from) {
    dates.push(customDateRange.to)
  }

  return dates
}

function getDayVisualState(dateKey, selectedDates) {
  if (selectedDates.length === 0) return 'default'
  if (selectedDates.length === 1) {
    return selectedDates[0] === dateKey ? 'single' : 'default'
  }

  const sorted = [...selectedDates].sort()
  if (dateKey === sorted[0]) return 'start'
  if (dateKey === sorted[1]) return 'end'
  return 'default'
}

function MonthGrid({ year, monthIndex, selectedDates, onDayClick }) {
  const monthLabel = MONTH_NAMES[monthIndex]
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const cells = useMemo(() => {
    const items = []

    for (let i = 0; i < firstWeekday; i += 1) {
      items.push({ type: 'empty', key: `empty-${year}-${monthIndex}-${i}` })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = toDateKey(year, monthIndex, day)
      items.push({
        type: 'day',
        key: dateKey,
        day,
        dateKey,
        visualState: getDayVisualState(dateKey, selectedDates),
      })
    }

    return items
  }, [daysInMonth, firstWeekday, monthIndex, selectedDates, year])

  return (
    <section className={styles.monthSection} aria-label={monthLabel}>
      <h2 className={styles.monthTitle}>{monthLabel}</h2>
      <div className={styles.daysGrid}>
        {cells.map((cell) => {
          if (cell.type === 'empty') {
            return <span key={cell.key} className={styles.dayEmpty} aria-hidden="true" />
          }

          return (
            <button
              key={cell.key}
              type="button"
              className={[
                styles.dayButton,
                cell.visualState === 'single' ? styles.daySingle : null,
                cell.visualState === 'start' ? styles.dayStart : null,
                cell.visualState === 'end' ? styles.dayEnd : null,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={cell.visualState !== 'default'}
              onClick={() => onDayClick(cell.dateKey)}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function DatePickerPlaceholder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isExpenseMode = searchParams.get('from') === 'newExpense'

  const setPeriodType = useFilterStore((state) => state.setPeriodType)
  const setCustomDateRange = useFilterStore((state) => state.setCustomDateRange)
  const completeExpenseDatePick = useActionMenuStore((state) => state.completeExpenseDatePick)
  const expenseDatePickerReturnPath = useActionMenuStore((state) => state.expenseDatePickerReturnPath)

  const [selectedDates, setSelectedDates] = useState(() => readInitialSelectedDates(isExpenseMode))

  const months = useMemo(() => buildMonthList(), [])

  const handleDayClick = (dateKey) => {
    if (isExpenseMode) {
      setSelectedDates([dateKey])
      return
    }

    setSelectedDates((prev) => {
      if (prev.length >= 2) return [dateKey]
      if (prev.length === 0) return [dateKey]
      if (prev[0] === dateKey) return prev
      return [...prev, dateKey]
    })
  }

  const handleSaveAndBack = () => {
    if (selectedDates.length === 0) {
      setPeriodType(null)
      setCustomDateRange({ from: null, to: null })
      navigate(-1)
      return
    }

    if (selectedDates.length === 1) {
      setPeriodType('custom')
      setCustomDateRange({ from: selectedDates[0], to: selectedDates[0] })
      navigate(-1)
      return
    }

    const sorted = [...selectedDates].sort()
    setPeriodType('custom')
    setCustomDateRange({ from: sorted[0], to: sorted[1] })
    navigate(-1)
  }

  const handleExpenseBack = () => {
    if (selectedDates.length === 1) {
      completeExpenseDatePick(selectedDates[0])
    }

    navigate(expenseDatePickerReturnPath || '/')
  }

  const headerTitle = isExpenseMode ? 'Выберите дату' : 'Выберите даты'

  return (
    <div className={styles.page}>
      <div className={styles.topFixed}>
        <header className={styles.header}>
          <BackButton onClick={isExpenseMode ? handleExpenseBack : handleSaveAndBack} />
          <h1 className={styles.headerTitle}>{headerTitle}</h1>
        </header>

        <div className={styles.weekdays} aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className={styles.weekday}>
              {label}
            </span>
          ))}
        </div>

        <div className={styles.divider} aria-hidden="true" />
      </div>

      <div className={styles.monthsScroll}>
        {months.map(({ year, monthIndex }) => (
          <MonthGrid
            key={`${year}-${monthIndex}`}
            year={year}
            monthIndex={monthIndex}
            selectedDates={selectedDates}
            onDayClick={handleDayClick}
          />
        ))}
      </div>
    </div>
  )}
