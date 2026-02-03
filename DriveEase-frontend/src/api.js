const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '')

const buildUrl = (path) => {
  if (path.startsWith('http')) {
    return path
  }
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`
  }
  return `${API_BASE_URL}/${path}`
}

const formatDetail = (detail) => {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (!item) return ''
        if (typeof item === 'string') return item
        if (item.msg) return item.msg
        return JSON.stringify(item)
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && detail.msg) {
    return detail.msg
  }
  return detail ? JSON.stringify(detail) : ''
}

const parseError = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await response.json()
    if (data?.detail) {
      return formatDetail(data.detail)
    }
    return formatDetail(data)
  }
  return response.text()
}

export const resolveMediaUrl = (path) => {
  if (!path) return ''
  return buildUrl(path)
}

export const request = async (path, options = {}) => {
  const { token, body, headers, method = 'GET' } = options
  const init = {
    method,
    headers: {
      ...(headers || {}),
    },
  }

  if (token) {
    init.headers.Authorization = `Bearer ${token}`
  }

  if (body instanceof FormData) {
    init.body = body
  } else if (body instanceof URLSearchParams) {
    init.body = body
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(buildUrl(path), init)
  if (!response.ok) {
    const message = await parseError(response)
    throw new Error(message || 'Request failed')
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export const login = (email, password) =>
  request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
  })

export const register = (payload) =>
  request('/api/auth/register', { method: 'POST', body: payload })

export const fetchMe = (token) => request('/api/auth/me', { token })

export const listVehicles = () => request('/api/vehicles')

export const createVehicle = (token, payload) =>
  request('/api/vehicles', { method: 'POST', token, body: payload })

export const updateVehicle = (token, id, payload) =>
  request(`/api/vehicles/${id}`, { method: 'PATCH', token, body: payload })

export const deleteVehicle = (token, id) =>
  request(`/api/vehicles/${id}`, { method: 'DELETE', token })

export const uploadVehicleImage = (token, id, file) => {
  const form = new FormData()
  form.append('file', file)
  return request(`/api/vehicles/${id}/image`, {
    method: 'POST',
    token,
    body: form,
  })
}

export const listMyBookings = (token) =>
  request('/api/bookings/me', { token })

export const listBookings = (token) => request('/api/bookings', { token })

export const createBooking = (token, payload) =>
  request('/api/bookings', { method: 'POST', token, body: payload })

export const cancelBooking = (token, id) =>
  request(`/api/bookings/${id}/cancel`, { method: 'PATCH', token })

export const updateBookingStatus = (token, id, status) =>
  request(`/api/bookings/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  })

export const updateMe = (token, payload) =>
  request('/api/users/me', { method: 'PATCH', token, body: payload })

export const uploadAvatar = (token, file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/api/users/me/avatar', { method: 'POST', token, body: form })
}

export const API_META = {
  baseUrl: API_BASE_URL,
}
