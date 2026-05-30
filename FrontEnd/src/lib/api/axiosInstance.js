import axios from 'axios'

import {
  getAccessToken,
  getTokens,
  refreshTokens,
} from './auth.js'

export const apiClient = axios.create({ baseURL: '/api' })

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(async (response) => {
  if (response.data?.message !== 'Access token expired') {
    return response
  }

  const { config } = response

  if (config._retry) {
    return Promise.reject(new Error('Access token expired'))
  }

  config._retry = true

  try {
    await refreshTokens()
  } catch {
    try {
      await getTokens()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return apiClient.request(config)
})
