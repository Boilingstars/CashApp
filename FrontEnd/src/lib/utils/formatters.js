const MONTH_NAMES = [
  'Января',
  'Февраля',
  'Марта',
  'Апреля',
  'Мая',
  'Июня',
  'Июля',
  'Августа',
  'Сентября',
  'Октября',
  'Ноября',
  'Декабря',
]

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDayMonth = (date) => {
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  return `${day} ${month}`
}

export function formatCurrency(amount, currencyCode = 'RUB') {
  const n = Math.abs(Number(amount) || 0)
  const formatted = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  if (currencyCode === 'RUB') return `${formatted} ₽`
  return `${formatted} ${currencyCode}`
}

export function formatTransactionTitle(serviceName, customServiceName) {
  if (customServiceName) return customServiceName
  return serviceName || ''
}

export function formatTransactionGroupDate(dateString) {
  const date = startOfDay(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const label = formatDayMonth(date)

  if (date.getTime() === today.getTime()) return `Сегодня, ${label}`
  if (date.getTime() === yesterday.getTime()) return `Вчера, ${label}`
  return label
}
