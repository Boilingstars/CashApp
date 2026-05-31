import { findReferenceIdByName } from './resolveReferenceIds.js'
import { formatOperationDateKey, formatOperationTime } from './formatOperationDateTime.js'

function parseAmountString(raw) {
  const numeric = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return numeric.toFixed(2)
}

function buildExpenseNote(draft) {
  const parts = []
  const cashbackDigits = draft.cashback?.replace(/\s/g, '')
  if (cashbackDigits) {
    parts.push(`Кешбэк: ${draft.cashback.trim()} ₽`)
  }
  return parts.join('. ')
}

/**
 * Тело POST /api/operations/create/ для траты из ActionMenu.
 */
export function buildExpenseOperationBody({
  draft,
  categories,
  services,
  usedFallback,
  currencyCode = 'RUB',
}) {
  const amount = parseAmountString(draft.amount)
  if (!amount || !draft.date || !draft.accountId) return null

  const accountId = Number(draft.accountId)
  if (!Number.isFinite(accountId)) return null

  const now = new Date()
  const body = {
    operation_type: 'expense',
    currency_code: currencyCode,
    amount,
    note: buildExpenseNote(draft),
    operation_date: draft.date,
    operation_time: formatOperationTime(now),
    account_id: accountId,
  }

  if (!usedFallback) {
    const categoryId = findReferenceIdByName(categories, draft.categoryName)
    const serviceId = findReferenceIdByName(services, draft.customServiceName)
    if (categoryId != null) body.category_id = categoryId
    if (serviceId != null) body.service_id = serviceId
  } else {
    const fallbackParts = []
    if (draft.categoryName) fallbackParts.push(`Категория: ${draft.categoryName}`)
    if (draft.customServiceName) fallbackParts.push(`Магазин: ${draft.customServiceName}`)
    if (fallbackParts.length) {
      body.note = [body.note, ...fallbackParts].filter(Boolean).join('. ')
    }
  }

  return body
}

/**
 * Тело POST /api/operations/create/ для поступления из ActionMenu.
 */
export function buildIncomeOperationBody({ amountRaw, accountId, currencyCode = 'RUB' }) {
  const amount = parseAmountString(amountRaw)
  if (!amount) return null

  const parsedAccountId = Number(accountId)
  if (!Number.isFinite(parsedAccountId)) return null

  const now = new Date()

  return {
    operation_type: 'income',
    currency_code: currencyCode,
    amount,
    note: '',
    operation_date: formatOperationDateKey(now),
    operation_time: formatOperationTime(now),
    account_id: parsedAccountId,
  }
}
