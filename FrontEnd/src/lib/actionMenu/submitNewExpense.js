import { useAccountsStore } from '../../stores/useAccountsStore.js'
import { useActionMenuStore } from '../../stores/useActionMenuStore.js'
import { useTransactionsStore } from '../../stores/useTransactionsStore.js'

/** TEMP: сохранение траты в zustand до backend API */
export function submitNewExpense() {
  const draft = useActionMenuStore.getState().newExpenseDraft
  if (!draft) return false

  const numericAmount = Number(draft.amount.replace(/\s/g, ''))
  if (!numericAmount || numericAmount <= 0) return false
  if (!draft.accountId || !draft.customServiceName || !draft.date || !draft.categoryName) {
    return false
  }

  const products = useAccountsStore.getState().products
  const product = products.find((item) => item.id === draft.accountId)
  if (!product) return false

  useAccountsStore.getState().updateProduct({
    id: draft.accountId,
    amount: (Number(product.amount) || 0) - numericAmount,
  })

  const accountSuffix = product.account_number
    ? String(product.account_number).slice(-4)
    : '0000'

  const now = new Date()
  const [year, month, day] = draft.date.split('-').map(Number)
  const operationDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes())

  const newTransaction = {
    id: `tx_${Date.now()}`,
    service_name: null,
    custom_service_name: draft.customServiceName,
    category_name: draft.categoryName,
    currency_code: product.currency_code || 'RUB',
    amount: numericAmount,
    operation: 'expense',
    operation_date: operationDate.toISOString(),
    account_number: `**** ${accountSuffix}`,
  }

  useTransactionsStore.getState().setTransactions([
    newTransaction,
    ...useTransactionsStore.getState().transactions,
  ])

  useActionMenuStore.getState().showNewExpenseSuccess()
  return true
}
