const pad2 = (n) => String(n).padStart(2, '0')

/** @param {Date} [date] */
export function formatOperationDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** @param {Date} [date] */
export function formatOperationTime(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}
