const API_BASE = '/api'

// BUG: no token refresh mechanism — once expired, user gets silent failures
function getHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// BUG: error handling inconsistent — some methods throw, some return error objects
async function apiRequest(method, path, body = null) {
  const options = {
    method,
    headers: getHeaders(),
  }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, options)

  // BUG: doesn't handle 401 by clearing token and redirecting to login
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Request failed')
  }

  return response.json()
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('POST', '/users/login', { email, password }),
  register: (data) => apiRequest('POST', '/users/register', data),
  getMe: () => apiRequest('GET', '/users/me'),

  // Users
  listUsers: () => apiRequest('GET', '/users/'),
  updateUser: (id, data) => apiRequest('PUT', `/users/${id}`, data),
  deleteUser: (id) => apiRequest('DELETE', `/users/${id}`),

  // Deals
  listDeals: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    return apiRequest('GET', `/deals/?${query.toString()}`)
  },
  getDeal: (id) => apiRequest('GET', `/deals/${id}`),
  createDeal: (data) => apiRequest('POST', '/deals/', data),
  updateDeal: (id, data) => apiRequest('PUT', `/deals/${id}`, data),
  moveDeal: (id, stage) => apiRequest('PUT', `/deals/${id}/move`, { stage }),
  deleteDeal: (id) => apiRequest('DELETE', `/deals/${id}`),
  getDealHistory: (id) => apiRequest('GET', `/deals/${id}/history`),

  // Contacts
  listContacts: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    return apiRequest('GET', `/contacts/?${query.toString()}`)
  },
  getContact: (id) => apiRequest('GET', `/contacts/${id}`),
  createContact: (data) => apiRequest('POST', '/contacts/', data),
  updateContact: (id, data) => apiRequest('PUT', `/contacts/${id}`, data),
  deleteContact: (id) => apiRequest('DELETE', `/contacts/${id}`),

  // Activities
  listActivities: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    return apiRequest('GET', `/activities/?${query.toString()}`)
  },
  createActivity: (data) => apiRequest('POST', '/activities/', data),
  deleteActivity: (id) => apiRequest('DELETE', `/activities/${id}`),
  getActivityFeed: (limit, before) => {
    const params = new URLSearchParams({ limit: limit || 20 })
    if (before) params.append('before', before)
    return apiRequest('GET', `/activities/feed?${params.toString()}`)
  },

  // Dashboard
  getDashboardSummary: () => apiRequest('GET', '/dashboard/summary'),
  getPipelineMetrics: () => apiRequest('GET', '/dashboard/pipeline'),
  getUserPerformance: () => apiRequest('GET', '/dashboard/performance'),
  getConversionFunnel: () => apiRequest('GET', '/dashboard/conversion'),
}
