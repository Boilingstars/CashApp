import { apiClient } from './axiosInstance.js'

const normalizeOperationsPage = (data) => ({
  results: Array.isArray(data?.results) ? data.results : [],
  next: data?.next ?? null,
  count: data?.count ?? null,
})

/** GET /api/operations/ — все страницы results для UI. */
export async function listOperations() {
  const allResults = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const { data } = await apiClient.get('/operations/', { params: { page } })
    const { results, next } = normalizeOperationsPage(data)
    allResults.push(...results)

    if (!next || results.length === 0) {
      hasNext = false
    } else {
      page += 1
    }

    if (page > 50) break
  }

  return allResults
}

/**
 * POST /api/operations/create/
 * @param {Record<string, unknown>} body
 */
export async function createOperation(body) {
  const { data } = await apiClient.post('/operations/create/', body)
  return data
}

/** GET /api/operations/ — raw первой страницы для debug на /profile. */
export async function getOperations() {
  const response = await apiClient.get('/operations/')
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  }
}
