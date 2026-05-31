/** @param {{ id: number, name: string }[]} items */
export function findReferenceIdByName(items, name) {
  if (!name || !Array.isArray(items)) return null
  const match = items.find((item) => item?.name === name)
  if (match?.id == null) return null
  const id = Number(match.id)
  return Number.isFinite(id) ? id : null
}
