// TNS Track - API client

const API_BASE = '/api/v1'

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tns_token') : null
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: { code: 'UNKNOWN', message: 'Error desconocido' } 
    }))
    throw new ApiError(
      response.status,
      error.error?.code || 'UNKNOWN',
      error.error?.message || 'Error desconocido'
    )
  }
  
  if (response.status === 204) {
    return undefined as T
  }
  
  return response.json()
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: import('./types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => fetchApi<void>('/auth/logout', { method: 'POST' }),
  me: () => fetchApi<import('./types').User>('/auth/me'),
}

// Alertas
export const alerts = {
  list: (params?: {
    status?: string
    zone_id?: number
    from?: string
    to?: string
    page?: number
    pageSize?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchApi<import('./types').PaginatedResponse<import('./types').Alert>>(
      `/alerts${query ? `?${query}` : ''}`
    )
  },
  get: (id: number) => fetchApi<import('./types').Alert>(`/alerts/${id}`),
  attend: (
    id: number,
    data: {
      action: 'revisada' | 'descartada' | 'escalada'
      discard_reason?: string
      discard_note?: string
      escalated_to?: number
      observation?: string
    }
  ) =>
    fetchApi<import('./types').Alert>(`/alerts/${id}/attend`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Reglas
export const rules = {
  list: (active?: boolean) => {
    const query = active !== undefined ? `?active=${active}` : ''
    return fetchApi<import('./types').Rule[]>(`/rules${query}`)
  },
  get: (id: number) => fetchApi<import('./types').Rule>(`/rules/${id}`),
  create: (data: Partial<import('./types').Rule>) =>
    fetchApi<import('./types').Rule>('/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('./types').Rule>) =>
    fetchApi<import('./types').Rule>(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/rules/${id}`, { method: 'DELETE' }),
}

// Registros de ingreso vehicular
export const vehicleEntries = {
  list: (params?: {
    plate?: string
    from?: string
    to?: string
    tenant_id?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchApi<import('./types').PaginatedResponse<import('./types').VehicleEntry>>(
      `/vehicle-entries${query ? `?${query}` : ''}`
    )
  },
  get: (id: number) => fetchApi<import('./types').VehicleEntry>(`/vehicle-entries/${id}`),
  create: (data: {
    plate: string
    declared_driver_name?: string
    declared_driver_id?: string
    tenant_id?: number
    destination_text?: string
    vehicle_type?: string
    entry_at: string
    observations?: string
  }) =>
    fetchApi<import('./types').VehicleEntry>('/vehicle-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('./types').VehicleEntry>) =>
    fetchApi<import('./types').VehicleEntry>(`/vehicle-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  searchByPlate: (plate: string) =>
    fetchApi<import('./types').VehicleEntry[]>(`/vehicle-entries/search?plate=${encodeURIComponent(plate)}`),
}

// Expedientes
export const caseFiles = {
  list: (params?: {
    status?: string
    match_status?: string
    from?: string
    to?: string
    tenant_id?: number
    plate?: string
    page?: number
    pageSize?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchApi<import('./types').PaginatedResponse<import('./types').CaseFile>>(
      `/case-files${query ? `?${query}` : ''}`
    )
  },
  get: (id: number) => fetchApi<import('./types').CaseFile>(`/case-files/${id}`),
  resolve: (
    id: number,
    data: {
      resolution: 'notificado' | 'desestimado' | 'archivado'
      resolution_note?: string
      selected_entry_id?: number
    }
  ) =>
    fetchApi<import('./types').CaseFile>(`/case-files/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  notifyTenant: (id: number, data: { subject: string; body_html: string }) =>
    fetchApi<void>(`/case-files/${id}/notify-tenant`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Tenants
export const tenants = {
  list: () => fetchApi<import('./types').Tenant[]>('/tenants'),
  get: (id: number) => fetchApi<import('./types').Tenant>(`/tenants/${id}`),
  create: (data: Partial<import('./types').Tenant>) =>
    fetchApi<import('./types').Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('./types').Tenant>) =>
    fetchApi<import('./types').Tenant>(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// Zonas
export const zones = {
  list: () => fetchApi<import('./types').Zone[]>('/zones'),
  get: (id: number) => fetchApi<import('./types').Zone>(`/zones/${id}`),
  create: (data: Partial<import('./types').Zone>) =>
    fetchApi<import('./types').Zone>('/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('./types').Zone>) =>
    fetchApi<import('./types').Zone>(`/zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// Cámaras
export const cameras = {
  list: (zone_id?: number) => {
    const query = zone_id ? `?zone_id=${zone_id}` : ''
    return fetchApi<import('./types').Camera[]>(`/cameras${query}`)
  },
  get: (id: number) => fetchApi<import('./types').Camera>(`/cameras/${id}`),
}

// NVRs
export const nvrs = {
  list: () => fetchApi<import('./types').Nvr[]>('/nvrs'),
  get: (id: number) => fetchApi<import('./types').Nvr>(`/nvrs/${id}`),
}

// Usuarios
export const users = {
  list: () => fetchApi<import('./types').User[]>('/users'),
  get: (id: number) => fetchApi<import('./types').User>(`/users/${id}`),
  create: (data: Partial<import('./types').User> & { password: string }) =>
    fetchApi<import('./types').User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<import('./types').User>) =>
    fetchApi<import('./types').User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// Reportes
export const reports = {
  operationalNoise: (params: { from: string; to: string; zone_id?: number }) =>
    fetchApi<unknown>(`/reports/operational-noise?from=${params.from}&to=${params.to}${params.zone_id ? `&zone_id=${params.zone_id}` : ''}`),
  responseTimes: (params: { from: string; to: string }) =>
    fetchApi<unknown>(`/reports/response-times?from=${params.from}&to=${params.to}`),
  matchConfidence: (params: { from: string; to: string }) =>
    fetchApi<unknown>(`/reports/match-confidence?from=${params.from}&to=${params.to}`),
  registryQuality: (params: { from: string; to: string }) =>
    fetchApi<unknown>(`/reports/registry-quality?from=${params.from}&to=${params.to}`),
  sourceAvailability: (params: { from: string; to: string }) =>
    fetchApi<unknown>(`/reports/source-availability?from=${params.from}&to=${params.to}`),
}

// Salud técnica
export const health = {
  nvrs: () => fetchApi<import('./types').NvrHealth[]>('/health/nvrs'),
  system: () => fetchApi<import('./types').SystemHealth>('/health/system'),
}

export { ApiError }
