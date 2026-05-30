import { TEMP_INCOME_CATEGORY_NAMES } from '../constants/tempIncomeCategoryNames.js'

/** TEMP: см. TEMP_INCOME_CATEGORY_NAMES — только expense для «Новая трата». */
export function filterExpenseCategories(categories) {
  if (!Array.isArray(categories)) return []

  return categories.filter(
    (item) => item?.name && !TEMP_INCOME_CATEGORY_NAMES.has(item.name),
  )
}
