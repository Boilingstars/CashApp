import { MOCK_TRANSACTIONS } from '../mocks/transactions.js'

/** TEMP fallback: custom_service_name из MOCK_TRANSACTIONS — см. useReferenceStore.applyMockFallback */
export function getExpenseServiceNameExamples() {
  const names = new Set()

  for (const tx of MOCK_TRANSACTIONS) {
    if (!tx.custom_service_name) continue
    names.add(tx.custom_service_name)
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'ru'))
}
