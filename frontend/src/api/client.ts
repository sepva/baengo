import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if we're already trying to refresh to avoid infinite loops
let isRefreshing = false
let failedQueue: Array<{
  onSuccess: (token: string) => void
  onError: (error: any) => void
}> = []

/**
 * Refresh access token using stored refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    })

    const { accessToken, refreshToken: newRefreshToken } = response.data
    
    // Update tokens in storage
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', newRefreshToken)
    
    return accessToken
  } catch (err) {
    // Refresh failed, clear tokens and redirect to login
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('username')
    localStorage.removeItem('userId')
    window.location.href = '/login'
    return null
  }
}

/**
 * Process queued requests after token refresh
 */
function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onError(error)
    } else if (token) {
      prom.onSuccess(token)
    }
  })
  
  failedQueue = []
}

// Add token to requests if it exists
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration and refresh
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Token refresh already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            onSuccess: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(client(originalRequest))
            },
            onError: (err: any) => {
              reject(err)
            },
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const newToken = await refreshAccessToken()
      processQueue(null, newToken)
      isRefreshing = false

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return client(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

// Helper function to handle auth responses
export function handleAuthResponse(data: any) {
  const { accessToken, refreshToken, userId, username } = data
  
  if (accessToken) localStorage.setItem('accessToken', accessToken)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  if (userId) localStorage.setItem('userId', userId.toString())
  if (username) localStorage.setItem('username', username)
  
  return data
}

export const authApi = {
  register: (username: string, password: string) =>
    client.post('/auth/register', { username, password }).then(r => handleAuthResponse(r.data)),
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }).then(r => handleAuthResponse(r.data)),
  logout: () => client.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    client.post('/auth/refresh', { refreshToken }).then(r => handleAuthResponse(r.data)),
}

export const gridApi = {
  getToday: () => client.get('/grid/today'),
  markItem: (gridId: number, itemId: number, marked: boolean) =>
    client.patch('/grid/mark', { gridId, itemId, marked }),
}

export const leaderboardApi = {
  getLifetime: (limit = 50) => client.get(`/leaderboard/lifetime?limit=${limit}`),
  getBingos: (limit = 50) => client.get(`/leaderboard/bingos?limit=${limit}`),
  getUserStats: (userId: number) => client.get(`/leaderboard/user/${userId}`),
}

export default client
