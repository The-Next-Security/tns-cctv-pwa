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

/** Clasificación operativa binaria: agrupa la escala de 4 niveles en dos categorías de flujo */
export type AlertClass = 'critica' | 'baja_prioridad'

export const ALERT_CLASS_LABELS: Record<AlertClass, string> = {
  critica: 'Crítica',
  baja_prioridad: 'Baja Prioridad',
}

/** Solo 'critica' → 'critica'; alta + media + baja → 'baja_prioridad' */
export function getAlertClass(criticality: Criticality): AlertClass {
  return criticality === 'critica' ? 'critica' : 'baja_prioridad'
}

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

export type PlateSource = 'anpr' | 'manual' | 'hybrid'

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
  model?: string | null
  resolution?: string | null
  fps?: number | null
  description?: string | null
  active: boolean
  health_status?: 'online' | 'offline' | 'degraded'
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
  /** ID real del evento en la base de datos (CHAR(26)); presente cuando proviene del backend */
  event_id?: string
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
  llamada_at?: string | null
  observation?: string | null
  description?: string
  plate?: string
  snapshot_url?: string | null
  resolved_at?: string | null
  resolution_notes?: string | null
  alert_class?: AlertClass
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
  // Acciones operativas (flujos CCTV.md)
  notify_admin?: boolean
  notify_tenant?: boolean
  record_evidence?: boolean
  can_escalate?: boolean
  escalation_roles?: Role[]
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
  plate_source?: PlateSource
  anpr_confidence?: number | null
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
  escalada: 'En Atención',
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

export const PLATE_SOURCE_LABELS: Record<PlateSource, string> = {
  anpr: 'ANPR automático',
  manual: 'Registro manual',
  hybrid: 'Híbrido (ANPR + guardia)',
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

// Categorias del catalogo de eventos Dahua
export type EventCategory = 'perimetro' | 'trafico' | 'salud'

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  perimetro: 'Perimetro / IA',
  trafico: 'Trafico / vehicular',
  salud: 'Sabotaje / salud tecnica',
}

export interface EventCodeDef {
  value: string
  label: string
  category: EventCategory
  // Explicacion breve del evento para la ayuda contextual (icono "i")
  description: string
  // Requiere camara dedicada ITC/LPR/ANPR (no aplica a camaras estandar)
  requiresDedicatedHardware?: boolean
}

// Catalogo de eventos realmente suscribibles via API HTTP Dahua
// (eventManager.cgi?action=attach, snapManager attachFileProc, eventos de trafico 10.1)
export const EVENT_CODES: EventCodeDef[] = [
  // Perimetro / IA
  {
    value: 'CrossLineDetection',
    label: 'Cruce de linea (tripwire)',
    category: 'perimetro',
    description:
      'Tripwire: se dispara cuando un objeto cruza una linea virtual definida en la escena, en la direccion configurada (entrar, salir o ambas).',
  },
  {
    value: 'CrossRegionDetection',
    label: 'Intrusion / entrada-salida de zona',
    category: 'perimetro',
    description:
      'Intrusion: se dispara cuando un objeto entra, sale o permanece dentro de una region poligonal vigilada.',
  },
  {
    value: 'WanderDetection',
    label: 'Merodeo (loitering)',
    category: 'perimetro',
    description:
      'Merodeo: una persona permanece o deambula dentro de una zona durante mas tiempo del permitido.',
  },
  {
    value: 'LeftDetection',
    label: 'Objeto abandonado',
    category: 'perimetro',
    description:
      'Objeto abandonado: detecta un objeto que aparece y permanece inmovil en la escena por sobre el tiempo tolerado.',
  },
  {
    value: 'TakenAwayDetection',
    label: 'Objeto retirado',
    category: 'perimetro',
    description:
      'Objeto retirado: detecta cuando un objeto vigilado desaparece de su posicion original.',
  },
  {
    value: 'SmartMotionHuman',
    label: 'Movimiento humano (IA)',
    category: 'perimetro',
    description:
      'Movimiento humano con IA: movimiento filtrado por la deteccion de personas; reduce falsas alarmas por animales, vegetacion o luces.',
  },
  {
    value: 'SmartMotionVehicle',
    label: 'Movimiento de vehiculo (IA)',
    category: 'perimetro',
    description:
      'Movimiento de vehiculo con IA: movimiento filtrado por la deteccion de vehiculos.',
  },
  {
    value: 'VideoMotion',
    label: 'Movimiento general',
    category: 'perimetro',
    description:
      'Movimiento general: cualquier cambio de pixeles en la zona, sin clasificar el objeto. Es el mas sensible y el que mas falsos positivos genera.',
  },
  // Trafico / vehicular (requiere hardware ITC/LPR/ANPR)
  {
    value: 'TrafficJunction',
    label: 'Paso de vehiculo / ANPR',
    category: 'trafico',
    requiresDedicatedHardware: true,
    description:
      'Paso de vehiculo / ANPR: captura la patente y datos del vehiculo cuando pasa por el punto de control. Requiere camara ITC/LPR dedicada.',
  },
  {
    value: 'TrafficOverSpeed',
    label: 'Exceso de velocidad',
    category: 'trafico',
    requiresDedicatedHardware: true,
    description:
      'Exceso de velocidad: el vehiculo supera el limite configurado; entrega velocidad medida y patente. Requiere camara ITC/LPR dedicada.',
  },
  {
    value: 'TrafficParking',
    label: 'Estacionamiento indebido',
    category: 'trafico',
    requiresDedicatedHardware: true,
    description:
      'Estacionamiento indebido: vehiculo detenido en una zona no permitida por sobre el tiempo tolerado.',
  },
  {
    value: 'TrafficPedestrain',
    label: 'Peaton en via vehicular',
    category: 'trafico',
    requiresDedicatedHardware: true,
    description:
      'Peaton en via: persona caminando sobre una via destinada a vehiculos.',
  },
  {
    value: 'TrafficRetrograde',
    label: 'Sentido contrario',
    category: 'trafico',
    requiresDedicatedHardware: true,
    description:
      'Sentido contrario: vehiculo circulando en una direccion prohibida (contramano).',
  },
  // Sabotaje / salud tecnica
  {
    value: 'VideoBlind',
    label: 'Camara cubierta / sabotaje',
    category: 'salud',
    description:
      'Camara cubierta / sabotaje: el lente fue tapado, desenfocado o manipulado y la escena dejo de ser visible.',
  },
  {
    value: 'VideoLoss',
    label: 'Perdida de senal de video',
    category: 'salud',
    description:
      'Perdida de senal: la camara dejo de entregar video al grabador (cable, energia o equipo caido).',
  },
  {
    value: 'StorageFailure',
    label: 'Falla de almacenamiento',
    category: 'salud',
    description:
      'Falla de almacenamiento: el disco del grabador presenta errores de lectura o escritura y puede no estar grabando.',
  },
  {
    value: 'StorageLowSpace',
    label: 'Espacio bajo en disco',
    category: 'salud',
    description:
      'Espacio bajo: la capacidad de grabacion esta por agotarse; el historial mas antiguo podria sobrescribirse.',
  },
]

const EVENT_CODE_MAP: Record<string, EventCodeDef> = Object.fromEntries(
  EVENT_CODES.map(e => [e.value, e])
)

// Nombre legible para un event_code Dahua (fallback al codigo crudo)
export function getEventLabel(code?: string | null): string {
  if (!code) return 'Evento de seguridad'
  return EVENT_CODE_MAP[code]?.label ?? code
}

export function getEventCategory(code?: string | null): EventCategory | undefined {
  if (!code) return undefined
  return EVENT_CODE_MAP[code]?.category
}

// True si alguno de los codigos depende de camara dedicada ITC/LPR
export function requiresDedicatedHardware(codes?: string[] | null): boolean {
  if (!codes?.length) return false
  return codes.some(c => EVENT_CODE_MAP[c]?.requiresDedicatedHardware)
}

// Codigos agrupados por categoria (para selectores)
export const EVENT_CODES_BY_CATEGORY: Record<EventCategory, EventCodeDef[]> = {
  perimetro: EVENT_CODES.filter(e => e.category === 'perimetro'),
  trafico: EVENT_CODES.filter(e => e.category === 'trafico'),
  salud: EVENT_CODES.filter(e => e.category === 'salud'),
}
