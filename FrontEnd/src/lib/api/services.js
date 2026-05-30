import { apiClient } from './axiosInstance.js'

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

/** GET /api/services/ — массив { id, name } для UI. */
export async function listServices() {
  const { data } = await apiClient.get('/services/')
  return normalizeListResponse(data)
}

/** GET /api/services/ — raw для debug-разведки на /profile. */
export async function getServices() {
  const response = await apiClient.get('/services/')
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  }
}