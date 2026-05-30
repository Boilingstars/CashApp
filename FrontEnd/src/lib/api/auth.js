import axios from 'axios'

const authClient = axios.create({ baseURL: '/api' })

let accessToken = null
let refreshToken = null

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

export function setTokens({ accessToken: access, refreshToken: refresh }) {
  if (access !== undefined) accessToken = access
  if (refresh !== undefined) refreshToken = refresh
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
}

export async function getTokens() {
  const { data } = await authClient.post('/auth/access/', {})
  setTokens({
    accessToken: data.access_token ?? data.access,
    refreshToken: data.refresh_token ?? data.refresh,
  })
  return data
}

export async function refreshTokens() {
  const token = getRefreshToken()
  if (!token) {
    throw new Error('No refresh token')
  }

  const { data } = await authClient.post('/auth/refresh/', {
    refresh_token: token,
  })
  setTokens({
    accessToken: data.access_token ?? data.access,
    refreshToken: data.refresh_token ?? data.refresh,
  })
  return data
}
