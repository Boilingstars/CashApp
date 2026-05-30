import { apiClient } from './axiosInstance.js'

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

/** GET /api/categories/ — массив { id, name } для UI. */
export async function listCategories() {
  const { data } = await apiClient.get('/categories/')
  return normalizeListResponse(data)
}

/** GET /api/categories/ — raw для debug-разведки на /profile. */
export async function getCategories() {
  const response = await apiClient.get('/categories/')
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  }
}