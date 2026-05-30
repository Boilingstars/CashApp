/**
 * TEMP: hardcoded exclude-list income-категорий из GET /api/categories/
 * (id 1–5 на момент разведки). Backend не отдаёт operation_type.
 * TODO: заменить на ?type=expense или поле type в ответе API.
 */
export const TEMP_INCOME_CATEGORY_NAMES = new Set([
  'Зарплата',
  'Подработка',
  'Кэшбэк',
  'Подарки',
  'Дивиденды',
])
