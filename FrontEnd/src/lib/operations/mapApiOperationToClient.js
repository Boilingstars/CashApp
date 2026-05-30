/**
 * API operation → модель useTransactionsStore / calcTransactionStats.
 */
const mapOperationType = (operationType) => {
  if (operationType === 'income') return 'income'
  // TEMP: backend transfer пока в expense-выборке UI (фильтр «Переводы» = expense)
  return 'expense'
}

const buildOperationDateIso = (operationDate, operationTime) => {
  if (!operationDate) return new Date().toISOString()
  const time = operationTime || '12:00:00'
  return `${operationDate}T${time}.000Z`
}

const toAccountNumberLabel = (serialNumber) => {
  const digits = String(serialNumber ?? '').replace(/\D/g, '')
  const last4 = digits.slice(-4) || '0000'
  return `**** ${last4}`
}

export function mapApiOperationToClient(apiOperation) {
  const service = apiOperation?.service

  return {
    id: String(apiOperation.id),
    service_name: service?.id != null ? String(service.id) : null,
    custom_service_name: service?.name ?? (apiOperation.note || null),
    category_name: apiOperation.category?.name ?? null,
    currency_code: apiOperation.currency_code || 'RUB',
    amount: Number(apiOperation.amount) || 0,
    operation: mapOperationType(apiOperation.operation_type),
    operation_date: buildOperationDateIso(
      apiOperation.operation_date,
      apiOperation.operation_time,
    ),
    account_number: toAccountNumberLabel(apiOperation.account?.serial_number),
  }
}

export function mapApiOperationsToClient(items) {
  if (!Array.isArray(items)) return []
  return items.map(mapApiOperationToClient)
}
