const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getNextPaymentDate(startPayment, intervalMonths) {
  const today = startOfDay(new Date())
  let date = startOfDay(startPayment)

  if (Number.isNaN(date.getTime())) return today

  const interval = intervalMonths > 0 ? intervalMonths : 1

  while (date < today) {
    date.setMonth(date.getMonth() + interval)
  }

  return date
}

export function getDaysUntilDate(date) {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diffMs = target.getTime() - today.getTime()
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, days)
}

export function sortPaymentsByNearest(payments) {
  return [...payments].sort((a, b) => {
    const dateA = getNextPaymentDate(a.start_payment, a.payment_interval_months)
    const dateB = getNextPaymentDate(b.start_payment, b.payment_interval_months)
    return dateA.getTime() - dateB.getTime()
  })
}
