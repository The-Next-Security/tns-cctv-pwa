// TNS Track - Tipos base

export type Role = 
  | 'vigilante' 
  | 'recepcion' 
  | 'recepcionista'
  | 'responsable_seguridad' 
  | 'admin_parque' 
  | 'soporte_tns'
  | 'supervisor'
  | 'tecnico'
  | 'visualizador'

export type UserRole = Role

export type Criticality = 'baja' | 'media' | 'alta' | 'critica'

export type AlertStatus = 'pendiente' | 'revisada' | 'descartada' | 'escalada' | 'en_revision' | 'resuelta'

export type MatchStatus = 
  | 'match_confiable' 
  | 'revision_manual' 
  | 'fuera_ventana' 
  | 'sin_coincidencia'

export type CaseResolution = 'pendiente' | 'notificado' | 'desestimado' | 'archivado'

export type DiscardReason = 
  | 'falso_positivo_iluminacion'
  | 'falso_positivo_vegetacion'
  | 'falso_positivo_polvo'
  | 'irrelevante_vehiculo_interno'
  | 'irrelevante_persona_autorizada'
  | 'otro'

export type InfractionType = 
  | 'exceso_velocidad'
  | 'zona_prohibida'
  | 'direccion_contraria'
  | 'otra'

export type VehicleType = 
  | 'particular'
  | 'camion'
  | 'moto'
  | 'utilitario'
  | 'otro'

export type NvrHealthStatus = 'ok' | 'degraded' | 'down'

// Usuario
export interface User {
  id: string | number
  email: string
  full_name?: string
  nombre?: string
  role: Role
  active?: boolean
  activo?: boolean
  last_login_at?: string | null
  ultimaConexion?: string
  created_at?: string
}

// Zona
export interface Zone {
  id: number
  code?: string
  name: string
  description?: string | null
  priority?: 'baja' | 'media' | 'alta' | 'critica'
  tenant_id?: number
  active: boolean
}

// NVR
export interface Nvr {
  id: number
  code: string
  model: string
  ip_address: string
  port: number
  firmware_version: string | null
  notes: string | null
  active: boolean
  last_health_check_at: string | null
  last_health_status: NvrHealthStatus
}

// Cámara
export interface Camera {
  id: number
  nvr_id?: number
  channel?: number
  zone_id?: number | null
  name: string
  ip?: string
  description?: string | null
  active: boolean
  zone?: Zone
  nvr?: Nvr
}

// NVR
export interface NVR {
  id: number
  name: string
  ip: string
  port: number
  status: 'online' | 'offline'
  cameras_count: number
  tenant_id?: number
}

// Alerta
export interface Alert {
  id: number
  event_raw_id?: number
  rule_id?: number | null
  camera_id?: number
  zone_id?: number | null
  event_type?: string
  event_code?: string
  criticality: Criticality
  status: AlertStatus
  pts_timestamp?: string
  timestamp: string
  created_at?: string
  attended_at?: string | null
  attended_by?: number | null
  assigned_to?: string | null
  response_time_seconds?: number | null
  discard_reason?: DiscardReason | null
  discard_note?: string | null
  escalated_to?: number | null
  observation?: string | null
  description?: string
  plate?: string
  snapshot_url?: string | null
  resolved_at?: string | null
  resolution_notes?: string | null
  // Relaciones expandidas
  camera?: Camera
  zone?: Zone
  rule?: Rule
  attended_by_user?: User
  escalated_to_user?: User
}

// Regla operativa
export interface Rule {
  id: number
  name: string
  description?: string | null
  zone_id?: number | null
  camera_id?: number | null
  event_codes?: string[]
  event_code_pattern: string
  time_window_start?: string | null
  time_window_end?: string | null
  time_from?: string | null
  time_to?: string | null
  days_of_week?: number[]
  criticality: Criticality
  generate_alert?: boolean
  priority_popup?: boolean
  active?: boolean
  enabled: boolean
  created_by?: number | null
  created_at?: string
  tenant_id?: number
  zone?: Zone
  camera?: Camera
}

// Tenant (arrendatario)
export interface Tenant {
  id: number
  rut?: string
  legal_name: string
  commercial_name?: string
  tax_id?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  notes?: string | null
  active: boolean
}

// Registro de ingreso vehicular
export interface VehicleEntry {
  id: number
  plate: string
  plate_normalized: string
  declared_driver_name: string
  declared_driver_id: string | null
  tenant_id: number | null
  destination_text: string | null
  vehicle_type: VehicleType | null
  entry_at: string
  exit_at: string | null
  registered_by: string | number
  observations: string | null
  created_at: string
  tenant?: Tenant
  registered_by_user?: User
}

// Infracción
export interface Infraction {
  id: number
  alert_id: number | null
  source: 'alert' | 'anpr_external' | 'manual'
  plate_read: string
  plate_read_normalized: string
  infraction_type: InfractionType
  speed_kmh: number | null
  speed_limit_kmh: number | null
  detected_at: string
  camera_id: number | null
  evidence_url: string | null
  camera?: Camera
  alert?: Alert
}

// Expediente
export interface CaseFile {
  id: number
  case_number: string
  infraction_id: number
  match_status: MatchStatus
  matched_entry_id: number | null
  candidate_entry_ids: number[] | null
  tenant_id: number | null
  resolution: CaseResolution
  resolved_by: number | null
  resolved_at: string | null
  resolution_note: string | null
  notification_sent_at: string | null
  created_at: string
  infraction?: Infraction
  matched_entry?: VehicleEntry
  candidate_entries?: VehicleEntry[]
  tenant?: Tenant
  resolved_by_user?: User
}

// Salud del sistema
export interface SystemHealth {
  db: 'ok' | 'degraded' | 'down'
  redis: 'ok' | 'degraded' | 'down'
  queue_depth: number
  uptime_seconds: number
}

export interface NvrHealth {
  id: number
  code: string
  status: NvrHealthStatus
  last_check: string
  latency_ms: number
  connected_cameras: number
}

// Paginación
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

// Auth
export interface AuthResponse {
  token: string
  user: User
}

// Constantes para mostrar en UI
export const CRITICALITY_LABELS: Record<Criticality, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica'
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  pendiente: 'Pendiente',
  revisada: 'Revisada',
  descartada: 'Descartada',
  escalada: 'Escalada',
  en_revision: 'En Revision',
  resuelta: 'Resuelta'
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  match_confiable: 'Match Confiable',
  revision_manual: 'Revision Manual',
  fuera_ventana: 'Fuera de Ventana',
  sin_coincidencia: 'Sin Coincidencia'
}

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  falso_positivo_iluminacion: 'Falso positivo - iluminacion',
  falso_positivo_vegetacion: 'Falso positivo - vegetacion',
  falso_positivo_polvo: 'Falso positivo - polvo/distancia',
  irrelevante_vehiculo_interno: 'Irrelevante - vehiculo interno',
  irrelevante_persona_autorizada: 'Irrelevante - persona autorizada',
  otro: 'Otro'
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  particular: 'Particular',
  camion: 'Camion',
  moto: 'Moto',
  utilitario: 'Utilitario',
  otro: 'Otro'
}

export const ROLE_LABELS: Record<Role, string> = {
  vigilante: 'Vigilante',
  recepcion: 'Recepcion',
  recepcionista: 'Recepcionista',
  responsable_seguridad: 'Responsable de Seguridad',
  admin_parque: 'Administrador',
  soporte_tns: 'Soporte TNS',
  supervisor: 'Supervisor',
  tecnico: 'Tecnico',
  visualizador: 'Visualizador'
}

export const DAYS_OF_WEEK = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
]

export const EVENT_CODES = [
  { value: 'CrossLineDetection', label: 'Cruzamiento de linea' },
  { value: 'CrossRegionDetection', label: 'Entrada/salida de region' },
  { value: 'LeftDetection', label: 'Objeto abandonado' },
  { value: 'TakenAwayDetection', label: 'Objeto removido' },
  { value: 'PersonAbandoned', label: 'Persona en zona prohibida' },
  { value: 'TrafficJunction', label: 'Vehiculo en interseccion' },
  { value: 'TrafficGate', label: 'Vehiculo en barrera' },
  { value: 'VideoMotion', label: 'Deteccion de movimiento' },
  { value: 'VideoBlind', label: 'Camara cubierta/sabotaje' },
  { value: 'LossDetection', label: 'Perdida de senal' },
  { value: 'TrafficSpeedOver', label: 'Exceso de velocidad' },
]
