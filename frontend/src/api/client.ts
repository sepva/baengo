import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if it exists
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('username')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (username: string, password: string) =>
    client.post('/auth/register', { username, password }),
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }),
  logout: () => client.post('/auth/logout'),
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
