import { createOperation } from '../api/operations.js'
import { buildExpenseOperationBody } from '../operations/buildCreateOperationBody.js'
import { applyOperationCreateResult } from '../operations/applyOperationCreateResult.js'
import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'
import { useReferenceStore } from '../../stores/useReferenceStore.js'

function extractApiError(err) {
  const data = err.response?.data
  if (typeof data === 'string') return data
  if (data?.error) return String(data.error)
  if (data?.detail) return String(data.detail)
  if (data?.message) return String(data.message)
  return err.message || 'Не удалось сохранить трату'
}

/**
 * POST /api/operations/create/ + обновление store из ответа.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function submitNewExpense() {
  const draft = useActionMenuStore.getState().newExpenseDraft
  if (!draft) return { ok: false, error: 'Нет данных формы' }

  const products = useAccountsStore.getState().products
  const product = products.find((item) => item.id === draft.accountId)
  if (!product) return { ok: false, error: 'Счёт не найден' }

  const { categories, services, usedFallback } = useReferenceStore.getState()

  const body = buildExpenseOperationBody({
    draft,
    categories,
    services,
    usedFallback,
    currencyCode: product.currency_code || 'RUB',
  })

  if (!body) {
    return { ok: false, error: 'Заполните сумму, категорию, счёт, магазин и дату' }
  }

  try {
    const created = await createOperation(body)

    applyOperationCreateResult(created, {
      patchClient: usedFallback
        ? {
            category_name: draft.categoryName || created.category?.name,
            custom_service_name:
              draft.customServiceName || created.service?.name || created.note,
          }
        : undefined,
    })

    useActionMenuStore.getState().showNewExpenseSuccess()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: extractApiError(err) }
  }
}
