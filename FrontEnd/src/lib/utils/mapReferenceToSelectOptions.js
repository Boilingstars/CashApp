/**
 * TEMP: adapter { id, name } → GlassSelect options.
 * value = name (не backend id) — submitNewExpense и draft пока хранят
 * category_name / custom_service_name строками.
 * TODO: после интеграции POST /api/operations/ перейти на value = String(id).
 */
export function mapReferenceToSelectOptions(items) {
  if (!Array.isArray(items)) return []

  return items
    .filter((item) => item?.name)
    .map((item) => ({
      value: item.name,
      label: item.name,
    }))
}
