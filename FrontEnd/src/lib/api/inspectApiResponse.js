const MOCK_TRANSACTION_FIELDS = [
  'id',
  'service_name',
  'custom_service_name',
  'category_name',
  'currency_code',
  'amount',
  'operation',
  'operation_date',
  'account_number',
]

const FRONTEND_PRODUCT_FIELDS = [
  'id',
  'user_id',
  'product_type',
  'bank_name',
  'currency_code',
  'amount',
  'custom_name',
  'account_number',
  'serial_number',
  'created_at',
  'updated_at',
]

const FRONTEND_SERVICE_SELECT_FIELDS = ['id', 'name', 'custom_service_name', 'service_name']

const FRONTEND_CATEGORY_SELECT_FIELDS = ['id', 'name', 'category_name']

const getValueType = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export const findItemsArray = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.operations)) return data.operations
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.services)) return data.services
  if (Array.isArray(data?.categories)) return data.categories
  if (Array.isArray(data?.items)) return data.items
  return null
}

const compareFields = (firstItem, expectedFields) => {
  if (!firstItem) {
    return {
      inFrontendOnly: expectedFields,
      inApiOnly: [],
      shared: [],
    }
  }

  return {
    inFrontendOnly: expectedFields.filter((field) => !(field in firstItem)),
    inApiOnly: Object.keys(firstItem).filter((field) => !expectedFields.includes(field)),
    shared: expectedFields.filter((field) => field in firstItem),
  }
}

const buildBaseShape = (data) => {
  const topLevelType = getValueType(data)
  const topLevelKeys =
    data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : []

  const items = findItemsArray(data)
  const firstItem = items?.[0] ?? null
  const sampleItems = items ? items.slice(0, 5) : []

  const fieldTypes = firstItem
    ? Object.fromEntries(
        Object.entries(firstItem).map(([key, value]) => [key, getValueType(value)]),
      )
    : null

  return {
    topLevelType,
    topLevelKeys,
    pagination: {
      count: data?.count ?? null,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
    },
    itemsArrayLength: items?.length ?? null,
    firstItemFields: firstItem ? Object.keys(firstItem) : null,
    fieldTypes,
    sampleItems,
  }
}

/**
 * Лёгкий анализ shape ответа API — не mapper, raw payload не меняет.
 */
export function inspectApiResponse(data) {
  const base = buildBaseShape(data)

  const firstItem = base.sampleItems?.[0] ?? null

  return {
    ...base,
    mockFieldComparison: firstItem
      ? compareFields(firstItem, MOCK_TRANSACTION_FIELDS)
      : null,
  }
}

/** Сравнение с полями bankProducts / ProductEdit / useAccountsStore. */
export function inspectProductsShape(data) {
  const base = buildBaseShape(data)
  const firstItem = base.sampleItems?.[0] ?? null

  return {
    ...base,
    frontendComparison: compareFields(firstItem, FRONTEND_PRODUCT_FIELDS),
    checks: {
      hasAmount: firstItem ? 'amount' in firstItem : null,
      amountType: firstItem ? getValueType(firstItem.amount) : null,
      hasProductType: firstItem ? 'product_type' in firstItem : null,
      hasSerialNumber: firstItem ? 'serial_number' in firstItem : null,
      hasAccountNumber: firstItem ? 'account_number' in firstItem : null,
    },
    frontendNote:
      'Store/UI ожидают product_type, amount, account_number; API может отдавать serial_number вместо account_number.',
  }
}

/** Сравнение с getExpenseServiceNameExamples (MOCK_TRANSACTIONS). */
export function inspectServicesShape(data) {
  const base = buildBaseShape(data)
  const firstItem = base.sampleItems?.[0] ?? null

  return {
    ...base,
    frontendComparison: compareFields(firstItem, FRONTEND_SERVICE_SELECT_FIELDS),
    checks: {
      hasId: firstItem ? 'id' in firstItem : null,
      hasName: firstItem ? 'name' in firstItem : null,
      onlyIdAndName:
        firstItem &&
        Object.keys(firstItem).length === 2 &&
        'id' in firstItem &&
        'name' in firstItem,
    },
    frontendNote:
      'ActionMenu сейчас берёт custom_service_name из MOCK_TRANSACTIONS; для GlassSelect достаточно value/label.',
  }
}

/** Сравнение с getExpenseCategories (MOCK_TRANSACTIONS.category_name). */
export function inspectCategoriesShape(data) {
  const base = buildBaseShape(data)
  const firstItem = base.sampleItems?.[0] ?? null

  return {
    ...base,
    frontendComparison: compareFields(firstItem, FRONTEND_CATEGORY_SELECT_FIELDS),
    checks: {
      hasId: firstItem ? 'id' in firstItem : null,
      hasName: firstItem ? 'name' in firstItem : null,
      onlyIdAndName:
        firstItem &&
        Object.keys(firstItem).length === 2 &&
        'id' in firstItem &&
        'name' in firstItem,
    },
    frontendNote:
      'ActionMenu сейчас использует category_name string из моков; API может дать id+name.',
  }
}
