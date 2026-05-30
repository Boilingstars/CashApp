/**
 * Статистика транзакций по типу операции: группировка по категориям,
 * summary для списка и chartData для donut (топ-4 + «Остальное», percent = 100%).
 */

const CHART_COLORS = ['#133C55', '#386FA4', '#59A5D8', '#84D2F6', '#91E5F6']

const UNCATEGORIZED = 'Без категории'
const OTHER_CATEGORY = 'Остальное'

/** Мин. доля сегмента на donut (~«круг» при cornerRadius), допускаем неточность графика */
const MIN_CHART_SEGMENT_PERCENT = 5.5

const roundPercent = (value) => Math.round(value * 10) / 10

const getCategoryName = (tx) => {
  const name = tx.category_name
  if (name == null || String(name).trim() === '') return UNCATEGORIZED
  return String(name)
}

export function getCategoryRoutePath(categoryName) {
  return `/transactions/categories/${encodeURIComponent(categoryName)}`
}

export function decodeCategoryRouteParam(categoryKey) {
  if (categoryKey == null || categoryKey === '') return ''
  try {
    return decodeURIComponent(categoryKey)
  } catch {
    return categoryKey
  }
}

export function filterTransactionsByCategory(transactions, categoryName, operationType) {
  if (!categoryName) return []

  return (transactions ?? []).filter(
    (tx) =>
      tx.operation === operationType && getCategoryName(tx) === categoryName,
  )
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const normalizeAccountLast4 = (value) => {
  if (!value) return ''
  const digits = String(value).replace(/\D/g, '')
  return digits.slice(-4)
}

const getCalendarWeekStart = (date) => {
  const d = startOfDay(date)
  const day = d.getDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - mondayOffset)
  return d
}

const getCalendarMonthStart = (date) => {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

const matchesPeriodFilter = (operationDate, periodType, customDateRange) => {
  if (!periodType) return true

  const txTime = new Date(operationDate).getTime()
  if (Number.isNaN(txTime)) return false

  if (periodType === 'week') {
    const weekStart = getCalendarWeekStart(new Date())
    const todayEnd = endOfDay(new Date())
    return txTime >= weekStart.getTime() && txTime <= todayEnd.getTime()
  }

  if (periodType === 'month') {
    const monthStart = getCalendarMonthStart(new Date())
    const todayEnd = endOfDay(new Date())
    return txTime >= monthStart.getTime() && txTime <= todayEnd.getTime()
  }

  if (periodType === 'custom') {
    const from = customDateRange?.from
    const to = customDateRange?.to
    if (!from && !to) return true

    if (from && txTime < startOfDay(from).getTime()) return false
    if (to && txTime > endOfDay(to).getTime()) return false
    return true
  }

  return true
}

/**
 * Применяет активные фильтры из useFilterStore к массиву транзакций.
 * @param {{ skipCategoryFilter?: boolean }} options — на странице категории категории из store игнорируются
 */
export function applyTransactionFilters(transactions, filters, options = {}) {
  const {
    selectedCategories = [],
    periodType = null,
    customDateRange = { from: null, to: null },
    selectedAccountNumbers = [],
    selectedOperations = [],
  } = filters

  const { skipCategoryFilter = false } = options

  return (transactions ?? []).filter((tx) => {
    if (!skipCategoryFilter && selectedCategories.length > 0) {
      if (!selectedCategories.includes(getCategoryName(tx))) return false
    }

    if (!matchesPeriodFilter(tx.operation_date, periodType, customDateRange)) {
      return false
    }

    if (selectedAccountNumbers.length > 0) {
      const last4 = normalizeAccountLast4(tx.account_number)
      if (!selectedAccountNumbers.includes(last4)) return false
    }

    if (selectedOperations.length > 0) {
      if (!selectedOperations.includes(tx.operation)) return false
    }

    return true
  })
}

/**
 * Метод наибольших остатков: percent в сумме ровно 100.0, шаг 0.1%.
 */
const normalizeChartPercents = (rows, totalAmount) => {
  if (rows.length === 0) return []

  if (totalAmount <= 0) {
    return rows.map((row) => ({ ...row, percent: 0 }))
  }

  const tenthsData = rows.map((row, index) => {
    const rawTenths = (row.totalAmount / totalAmount) * 1000
    const floorTenths = Math.floor(rawTenths)
    const remainder = rawTenths - floorTenths
    return { index, floorTenths, remainder }
  })

  const sumFloor = tenthsData.reduce((sum, item) => sum + item.floorTenths, 0)
  let toDistribute = 1000 - sumFloor

  const byRemainder = [...tenthsData].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder
    return a.index - b.index
  })

  const finalTenths = new Map(
    tenthsData.map((item) => [item.index, item.floorTenths]),
  )

  for (let i = 0; i < toDistribute; i += 1) {
    const { index } = byRemainder[i]
    finalTenths.set(index, finalTenths.get(index) + 1)
  }

  return rows.map((row, index) => ({
    ...row,
    percent: finalTenths.get(index) / 10,
  }))
}

/**
 * Для отрисовки pie: мелкие категории не сжимаются в «черточку»,
 * крупные пропорционально ужимаются. Сумма визуальных долей = 100%.
 */
const applyMinimumChartSegmentPercents = (rows, minPercent = MIN_CHART_SEGMENT_PERCENT) => {
  if (rows.length === 0) return []
  if (rows.length === 1) return [{ ...rows[0], percent: 100 }]

  const actual = rows.map((row) => row.percent)
  let visual = actual.map((p) => Math.max(p, minPercent))

  const sumVisual = () => visual.reduce((total, value) => total + value, 0)

  if (sumVisual() > 100) {
    const fixedIndexes = actual
      .map((p, index) => (p < minPercent ? index : -1))
      .filter((index) => index >= 0)
    const fixedTotal = fixedIndexes.length * minPercent
    let budget = 100 - fixedTotal

    if (budget <= 0) {
      visual = rows.map(() => 100 / rows.length)
    } else {
      const flexIndexes = actual
        .map((p, index) => (p >= minPercent ? index : -1))
        .filter((index) => index >= 0)
      const flexActualSum = flexIndexes.reduce((sum, index) => sum + actual[index], 0)

      visual = actual.map((p, index) => {
        if (fixedIndexes.includes(index)) return minPercent
        if (flexActualSum <= 0) return budget / flexIndexes.length
        return (p / flexActualSum) * budget
      })
    }
  } else if (sumVisual() < 100) {
    const deficit = 100 - sumVisual()
    const flexIndexes = actual
      .map((p, index) => (p > minPercent ? index : -1))
      .filter((index) => index >= 0)

    if (flexIndexes.length === 0) {
      const extra = deficit / rows.length
      visual = visual.map((value) => value + extra)
    } else {
      const flexActualSum = flexIndexes.reduce((sum, index) => sum + actual[index], 0)
      visual = visual.map((value, index) => {
        if (!flexIndexes.includes(index)) return value
        return value + (actual[index] / flexActualSum) * deficit
      })
    }
  }

  const visualTotal = visual.reduce((sum, value) => sum + value, 0)
  const weightedRows = rows.map((row, index) => ({
    category_name: row.category_name,
    totalAmount: visual[index],
    count: row.count,
  }))

  return normalizeChartPercents(weightedRows, visualTotal)
}

const buildChartRows = (summaryData) => {
  if (summaryData.length <= 5) {
    return summaryData.map(({ category_name, totalAmount, count }) => ({
      category_name,
      totalAmount,
      count,
    }))
  }

  const top4 = summaryData.slice(0, 4)
  const rest = summaryData.slice(4)

  const otherAmount = rest.reduce((sum, row) => sum + row.totalAmount, 0)
  const otherCount = rest.reduce((sum, row) => sum + row.count, 0)

  return [
    ...top4.map(({ category_name, totalAmount, count }) => ({
      category_name,
      totalAmount,
      count,
    })),
    {
      category_name: OTHER_CATEGORY,
      totalAmount: otherAmount,
      count: otherCount,
    },
  ]
}

export function calcTransactionStats(transactions, operationType) {
  const filtered = (transactions ?? []).filter((tx) => tx.operation === operationType)

  if (filtered.length === 0) {
    return {
      chartData: [],
      summaryData: [],
      totalAmount: 0,
    }
  }

  const byCategory = new Map()

  for (const tx of filtered) {
    const category_name = getCategoryName(tx)
    const amount = Number(tx.amount) || 0

    if (!byCategory.has(category_name)) {
      byCategory.set(category_name, { category_name, totalAmount: 0, count: 0 })
    }

    const row = byCategory.get(category_name)
    row.totalAmount += amount
    row.count += 1
  }

  const totalAmount = filtered.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  const summaryData = [...byCategory.values()]
    .map((row) => ({
      category_name: row.category_name,
      totalAmount: row.totalAmount,
      count: row.count,
      percent:
        totalAmount > 0
          ? roundPercent((row.totalAmount / totalAmount) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  const chartRows = buildChartRows(summaryData)
  const chartWithPercents = normalizeChartPercents(chartRows, totalAmount)
  const chartWithVisualPercents = applyMinimumChartSegmentPercents(chartWithPercents)

  const chartData = chartWithVisualPercents.map((row, index) => ({
    category_name: row.category_name,
    totalAmount: chartWithPercents[index].totalAmount,
    count: row.count,
    percent: row.percent,
    color: CHART_COLORS[index] ?? CHART_COLORS[CHART_COLORS.length - 1],
  }))

  return {
    chartData,
    summaryData,
    totalAmount,
  }
}
