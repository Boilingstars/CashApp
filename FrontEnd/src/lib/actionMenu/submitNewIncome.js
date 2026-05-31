import { createOperation } from '../api/operations.js'
import { buildIncomeOperationBody } from '../operations/buildCreateOperationBody.js'
import { applyOperationCreateResult } from '../operations/applyOperationCreateResult.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'

function extractApiError(err) {
  const data = err.response?.data
  if (typeof data === 'string') return data
  if (data?.error) return String(data.error)
  if (data?.detail) return String(data.detail)
  if (data?.message) return String(data.message)
  return err.message || 'Не удалось сохранить поступление'
}

/**
 * POST /api/operations/create/ (income) + обновление store из ответа.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function submitNewIncome({ amount, accountId }) {
  const products = useAccountsStore.getState().products
  const product = products.find((item) => item.id === accountId)
  if (!product) return { ok: false, error: 'Счёт не найден' }

  const body = buildIncomeOperationBody({
    amountRaw: amount,
    accountId,
    currencyCode: product.currency_code || 'RUB',
  })

  if (!body) {
    return { ok: false, error: 'Укажите сумму и счёт' }
  }

  try {
    const created = await createOperation(body)
    applyOperationCreateResult(created)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: extractApiError(err) }
  }
}
