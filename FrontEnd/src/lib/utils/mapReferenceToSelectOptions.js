/**
 * Adapter { id, name } → GlassSelect options.
 * value = name; id резолвится в buildCreateOperationBody при POST /operations/create/.
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
