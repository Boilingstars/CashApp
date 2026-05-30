/**
 * Формат отображения даты траты в action-menu (Figma: «13:00, 29.05»).
 * @param {string} dateKey — YYYY-MM-DD
 * @param {Date} [now]
 */
export function formatExpenseDateDisplay(dateKey, now = new Date()) {
  if (!dateKey) return ''

  const parts = dateKey.split('-')
  if (parts.length !== 3) return ''

  const day = parts[2]
  const month = parts[1]
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}, ${day}.${month}`
}
