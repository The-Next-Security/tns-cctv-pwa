// Mock data for TNS Track MVP demonstration
import type { Alert, Zone, Tenant, VehicleEntry, Rule, User, Camera, NVR, Criticality, AlertStatus, PlateSource } from './types'

function todayAt(hour: number, minute = 0): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function resolvedAt(hour: number, minute: number, minutesAfter = 25): string {
  const date = new Date()
  date.setHours(hour, minute + minutesAfter, 0, 0)
  return date.toISOString()
}

type TodayAlertSeed = {
  event_type: string
  event_code: string
  criticality: Criticality
  status: AlertStatus
  zoneIndex: number
  cameraIndex: number
  hour: number
  minute?: number
  description: string
  plate?: string
  assigned_to?: string
  resolved?: boolean
  resolution_notes?: string
}

function buildTodayHistoricalAlerts(seeds: TodayAlertSeed[], startId: number): Alert[] {
  return seeds.map((seed, index) => {
    const zone = MOCK_ZONES[seed.zoneIndex]
    const camera = MOCK_CAMERAS[seed.cameraIndex]
    const timestamp = todayAt(seed.hour, seed.minute ?? 0)
    const isResolved =
      seed.resolved ?? (seed.status === 'resuelta' || seed.status === 'descartada' || seed.status === 'escalada')

    return {
      id: startId + index,
      event_type: seed.event_type,
      event_code: seed.event_code,
      criticality: seed.criticality,
      status: seed.status,
      zone_id: zone.id,
      zone,
      camera_id: camera.id,
      camera: { ...camera, zone_id: zone.id },
      timestamp,
      snapshot_url: '/placeholder.svg?height=200&width=300',
      description: seed.description,
      plate: seed.plate,
      assigned_to: seed.assigned_to,
      resolved_at: isResolved ? resolvedAt(seed.hour, seed.minute ?? 0) : null,
      resolution_notes: seed.resolution_notes,
    }
  })
}

// Zonas mock
export const MOCK_ZONES: Zone[] = [
  { id: 1, name: 'Entrada Principal', description: 'Acceso vehicular y peatonal principal', priority: 'critica', tenant_id: 1, active: true },
  { id: 2, name: 'Zona Industrial A', description: 'Bodegas y naves industriales sector norte', priority: 'alta', tenant_id: 1, active: true },
  { id: 3, name: 'Zona Industrial B', description: 'Bodegas y naves industriales sector sur', priority: 'alta', tenant_id: 1, active: true },
  { id: 4, name: 'Zona Logistica', description: 'Area de carga y descarga', priority: 'alta', tenant_id: 1, active: true },
  { id: 5, name: 'Estacionamiento', description: 'Estacionamiento general de vehiculos', priority: 'media', tenant_id: 1, active: true },
  { id: 6, name: 'Perimetro Norte', description: 'Cerco perimetral sector norte', priority: 'critica', tenant_id: 1, active: true },
  { id: 7, name: 'Perimetro Sur', description: 'Cerco perimetral sector sur', priority: 'critica', tenant_id: 1, active: true },
  { id: 8, name: 'Area Administrativa', description: 'Oficinas y administracion', priority: 'media', tenant_id: 1, active: true },
]

// Empresas (Tenants) mock
export const MOCK_TENANTS: Tenant[] = [
  { id: 1, rut: '76.123.456-7', legal_name: 'Agrolivo SpA', commercial_name: 'Agrolivo', active: true },
  { id: 2, rut: '76.234.567-8', legal_name: 'Transportes del Valle Ltda.', commercial_name: 'Transportes del Valle', active: true },
  { id: 3, rut: '76.345.678-9', legal_name: 'Logistica Central S.A.', commercial_name: 'LogiCentral', active: true },
  { id: 4, rut: '76.456.789-0', legal_name: 'Distribuidora Norte Ltda.', commercial_name: 'DisNorte', active: true },
  { id: 5, rut: '76.567.890-1', legal_name: 'Alimentos del Sur SpA', commercial_name: 'AliSur', active: true },
  { id: 6, rut: '76.678.901-2', legal_name: 'Metalurgica Industrial S.A.', commercial_name: 'MetalInd', active: true },
  { id: 7, rut: '76.789.012-3', legal_name: 'Comercial Importadora Ltda.', commercial_name: 'ComImport', active: true },
  { id: 8, rut: '76.890.123-4', legal_name: 'Servicios Tecnicos SpA', commercial_name: 'ServTec', active: true },
]

// Alertas en tiempo real (ultimos minutos)
const MOCK_ALERTS_LIVE: Alert[] = [
  {
    id: 1,
    event_type: 'intrusion',
    event_code: 'INTRUSION_PERIMETRO',
    criticality: 'critica',
    status: 'pendiente',
    zone_id: 6,
    zone: MOCK_ZONES[5],
    camera_id: 1,
    camera: { id: 1, name: 'CAM-PER-N01', ip: '192.168.1.101', channel: 1, nvr_id: 1, zone_id: 6, active: true },
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Movimiento detectado en cerco perimetral norte',
  },
  {
    id: 2,
    event_type: 'velocidad',
    event_code: 'VELOCIDAD_EXCESIVA',
    criticality: 'alta',
    status: 'pendiente',
    zone_id: 5,
    zone: MOCK_ZONES[4],
    camera_id: 2,
    camera: { id: 2, name: 'CAM-EST-01', ip: '192.168.1.102', channel: 2, nvr_id: 1, zone_id: 5, active: true },
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Vehiculo circulando a velocidad excesiva en estacionamiento',
    plate: 'BCDF-12',
  },
  {
    id: 3,
    event_type: 'movimiento',
    event_code: 'MOVIMIENTO_NOCTURNO',
    criticality: 'alta',
    status: 'pendiente',
    zone_id: 2,
    zone: MOCK_ZONES[1],
    camera_id: 3,
    camera: { id: 3, name: 'CAM-IND-A01', ip: '192.168.1.103', channel: 3, nvr_id: 1, zone_id: 2, active: true },
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Movimiento detectado en zona industrial fuera de horario',
  },
  {
    id: 4,
    event_type: 'acceso',
    event_code: 'ACCESO_NO_AUTORIZADO',
    criticality: 'media',
    status: 'pendiente',
    zone_id: 1,
    zone: MOCK_ZONES[0],
    camera_id: 4,
    camera: { id: 4, name: 'CAM-ENT-01', ip: '192.168.1.104', channel: 4, nvr_id: 1, zone_id: 1, active: true },
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Intento de acceso sin autorizacion en entrada principal',
  },
  {
    id: 5,
    event_type: 'objeto',
    event_code: 'OBJETO_ABANDONADO',
    criticality: 'media',
    status: 'pendiente',
    zone_id: 4,
    zone: MOCK_ZONES[3],
    camera_id: 5,
    camera: { id: 5, name: 'CAM-LOG-01', ip: '192.168.1.105', channel: 5, nvr_id: 1, zone_id: 4, active: true },
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Objeto abandonado detectado en zona de carga',
  },
  {
    id: 6,
    event_type: 'persona',
    event_code: 'PERSONA_CAIDA',
    criticality: 'critica',
    status: 'en_revision',
    zone_id: 3,
    zone: MOCK_ZONES[2],
    camera_id: 6,
    camera: { id: 6, name: 'CAM-IND-B01', ip: '192.168.1.106', channel: 6, nvr_id: 1, zone_id: 3, active: true },
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Posible caida de persona detectada',
    assigned_to: 'Carlos Rodriguez',
  },
  {
    id: 7,
    event_type: 'vehiculo',
    event_code: 'VEHICULO_ESTACIONADO',
    criticality: 'baja',
    status: 'resuelta',
    zone_id: 5,
    zone: MOCK_ZONES[4],
    camera_id: 7,
    camera: { id: 7, name: 'CAM-EST-02', ip: '192.168.1.107', channel: 7, nvr_id: 1, zone_id: 5, active: true },
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Vehiculo estacionado en zona no permitida',
    resolved_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolution_notes: 'Vehiculo retirado por el propietario',
  },
  {
    id: 8,
    event_type: 'intrusion',
    event_code: 'INTRUSION_PERIMETRO',
    criticality: 'alta',
    status: 'resuelta',
    zone_id: 7,
    zone: MOCK_ZONES[6],
    camera_id: 8,
    camera: { id: 8, name: 'CAM-PER-S01', ip: '192.168.1.108', channel: 8, nvr_id: 1, zone_id: 7, active: true },
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    snapshot_url: '/placeholder.svg?height=200&width=300',
    description: 'Movimiento detectado en perimetro sur',
    resolved_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    resolution_notes: 'Falsa alarma - animal silvestre',
  },
]

// Ingresos vehiculares mock
export const MOCK_VEHICLE_ENTRIES: VehicleEntry[] = [
  {
    id: 1,
    plate: 'BCDF-12',
    plate_normalized: 'BCDF12',
    declared_driver_name: 'Juan Perez',
    declared_driver_id: '12.345.678-9',
    tenant_id: 2,
    tenant: MOCK_TENANTS[1],
    destination_text: 'Bodega 3 - Descarga mercaderia',
    vehicle_type: 'camion',
    entry_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    exit_at: null,
    registered_by: '1',
    observations: 'Transporta materiales de construccion',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    plate_source: 'hybrid',
    anpr_confidence: 96,
  },
  {
    id: 2,
    plate: 'WXYZ-98',
    plate_normalized: 'WXYZ98',
    declared_driver_name: 'Maria Gonzalez',
    declared_driver_id: '13.456.789-0',
    tenant_id: 3,
    tenant: MOCK_TENANTS[2],
    destination_text: 'Oficinas administrativas',
    vehicle_type: 'particular',
    entry_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    exit_at: null,
    registered_by: '1',
    observations: null,
    created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    plate_source: 'anpr',
    anpr_confidence: 92,
  },
  {
    id: 3,
    plate: 'LMNO-45',
    plate_normalized: 'LMNO45',
    declared_driver_name: 'Pedro Martinez',
    declared_driver_id: '14.567.890-1',
    tenant_id: 4,
    tenant: MOCK_TENANTS[3],
    destination_text: 'Bodega 7 - Retiro productos',
    vehicle_type: 'utilitario',
    entry_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    exit_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    registered_by: '1',
    observations: null,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    plate_source: 'manual',
  },
  {
    id: 4,
    plate: 'HIJK-67',
    plate_normalized: 'HIJK67',
    declared_driver_name: 'Ana Silva',
    declared_driver_id: '15.678.901-2',
    tenant_id: 5,
    tenant: MOCK_TENANTS[4],
    destination_text: 'Area de produccion',
    vehicle_type: 'particular',
    entry_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    exit_at: null,
    registered_by: '1',
    observations: null,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    plate_source: 'hybrid',
    anpr_confidence: 88,
  },
  {
    id: 5,
    plate: 'QRST-23',
    plate_normalized: 'QRST23',
    declared_driver_name: 'Roberto Diaz',
    declared_driver_id: '16.789.012-3',
    tenant_id: 6,
    tenant: MOCK_TENANTS[5],
    destination_text: 'Bodega 10 - Mantenimiento',
    vehicle_type: 'camion',
    entry_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    exit_at: null,
    registered_by: '1',
    observations: 'Equipo de mantenimiento',
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    plate_source: 'anpr',
    anpr_confidence: 94,
  },
]

// Reglas mock
export const MOCK_RULES: Rule[] = [
  {
    id: 1,
    name: 'Intrusion perimetral nocturna',
    description: 'Detecta movimientos en zonas perimetrales durante horario nocturno',
    event_code_pattern: 'INTRUSION_*',
    criticality: 'critica',
    zone_id: 6,
    zone: MOCK_ZONES[5],
    time_from: '22:00',
    time_to: '06:00',
    enabled: true,
    tenant_id: 1,
  },
  {
    id: 2,
    name: 'Velocidad excesiva',
    description: 'Vehiculos que exceden la velocidad permitida dentro del parque',
    event_code_pattern: 'VELOCIDAD_*',
    criticality: 'alta',
    zone_id: null,
    time_from: '00:00',
    time_to: '23:59',
    enabled: true,
    tenant_id: 1,
  },
  {
    id: 3,
    name: 'Acceso no autorizado',
    description: 'Intentos de acceso sin credenciales validas',
    event_code_pattern: 'ACCESO_*',
    criticality: 'alta',
    zone_id: 1,
    zone: MOCK_ZONES[0],
    time_from: '00:00',
    time_to: '23:59',
    enabled: true,
    tenant_id: 1,
  },
  {
    id: 4,
    name: 'Movimiento fuera de horario',
    description: 'Movimiento en zonas industriales fuera de horario laboral',
    event_code_pattern: 'MOVIMIENTO_*',
    criticality: 'media',
    zone_id: 2,
    zone: MOCK_ZONES[1],
    time_from: '20:00',
    time_to: '06:00',
    enabled: true,
    tenant_id: 1,
  },
  {
    id: 5,
    name: 'Objeto abandonado',
    description: 'Deteccion de objetos abandonados en zonas de transito',
    event_code_pattern: 'OBJETO_*',
    criticality: 'media',
    zone_id: null,
    time_from: '00:00',
    time_to: '23:59',
    enabled: false,
    tenant_id: 1,
  },
]

// Usuarios mock
export const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@agrolivo.cl',
    nombre: 'Carlos Rodriguez',
    role: 'admin_parque',
    ultimaConexion: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    activo: true,
  },
  {
    id: '2',
    email: 'supervisor@agrolivo.cl',
    nombre: 'Maria Gonzalez',
    role: 'supervisor',
    ultimaConexion: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    activo: true,
  },
  {
    id: '3',
    email: 'operador@agrolivo.cl',
    nombre: 'Juan Perez',
    role: 'vigilante',
    ultimaConexion: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    activo: true,
  },
  {
    id: '4',
    email: 'recepcionista@agrolivo.cl',
    nombre: 'Ana Silva',
    role: 'recepcionista',
    ultimaConexion: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    activo: true,
  },
  {
    id: '5',
    email: 'tecnico@agrolivo.cl',
    nombre: 'Roberto Diaz',
    role: 'tecnico',
    ultimaConexion: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    activo: false,
  },
]

// Camaras mock
export const MOCK_CAMERAS: Camera[] = [
  { id: 1, name: 'CAM-PER-N01', ip: '192.168.1.101', channel: 1, nvr_id: 1, zone_id: 6, active: true },
  { id: 2, name: 'CAM-EST-01', ip: '192.168.1.102', channel: 2, nvr_id: 1, zone_id: 5, active: true },
  { id: 3, name: 'CAM-IND-A01', ip: '192.168.1.103', channel: 3, nvr_id: 1, zone_id: 2, active: true },
  { id: 4, name: 'CAM-ENT-01', ip: '192.168.1.104', channel: 4, nvr_id: 1, zone_id: 1, active: true },
  { id: 5, name: 'CAM-LOG-01', ip: '192.168.1.105', channel: 5, nvr_id: 2, zone_id: 4, active: true },
  { id: 6, name: 'CAM-IND-B01', ip: '192.168.1.106', channel: 6, nvr_id: 2, zone_id: 3, active: true },
  { id: 7, name: 'CAM-EST-02', ip: '192.168.1.107', channel: 7, nvr_id: 2, zone_id: 5, active: true },
  { id: 8, name: 'CAM-PER-S01', ip: '192.168.1.108', channel: 8, nvr_id: 2, zone_id: 7, active: true },
]

/** Alertas históricas del mismo día, distribuidas por franja horaria para demos del panel lateral */
const MOCK_ALERTS_TODAY_HISTORICAL = buildTodayHistoricalAlerts(
  [
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 5, cameraIndex: 7, hour: 6, minute: 12, description: 'Movimiento en perimetro norte al amanecer', resolved: true, resolution_notes: 'Guardia de turno verifico — fauna' },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 6, minute: 45, description: 'Camion de proveedor estacionado en anden', resolved: true, resolution_notes: 'Conductor reubicado' },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 7, minute: 8, description: 'Peaton sin credencial en entrada principal', resolved: true, resolution_notes: 'Visitante registrado en recepcion' },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'media', status: 'descartada', zoneIndex: 3, cameraIndex: 4, hour: 7, minute: 52, description: 'Actividad en muelle de carga antes de horario', resolved: true, resolution_notes: 'Personal autorizado de logistica' },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 8, minute: 5, description: 'Exceso de velocidad en acceso vehicular', plate: 'KLMN-34', resolved: true, resolution_notes: 'Notificado al conductor' },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 6, hour: 8, minute: 22, description: 'Furgon en zona de carga rapida', resolved: true },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 8, minute: 41, description: 'Tarjeta de acceso vencida en torniquete', resolved: true },
    { event_type: 'objeto', event_code: 'OBJETO_ABANDONADO', criticality: 'media', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 9, minute: 10, description: 'Pallet abandonado en zona logistica', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 6, cameraIndex: 7, hour: 9, minute: 33, description: 'Salto de cerco en perimetro sur', resolved: true, resolution_notes: 'Falsa alarma — viento movio malla' },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'media', status: 'resuelta', zoneIndex: 1, cameraIndex: 2, hour: 9, minute: 55, description: 'Operarios ingresando a nave industrial A', resolved: true },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 10, minute: 7, description: 'Camion en maniobra a velocidad inadecuada', plate: 'PQRS-78', resolved: true },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 10, minute: 18, description: 'Intento de ingreso sin cita en recepcion', resolved: true },
    { event_type: 'objeto', event_code: 'OBJETO_ABANDONADO', criticality: 'media', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 10, minute: 34, description: 'Caja sin etiqueta en pasillo de despacho', resolved: true },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 6, hour: 10, minute: 50, description: 'Automovil en zona de descarga', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'critica', status: 'escalada', zoneIndex: 5, cameraIndex: 0, hour: 11, minute: 3, description: 'Intento de ingreso por sector norte', resolved: true, resolution_notes: 'Escalada a supervisor — persona identificada' },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'alta', status: 'resuelta', zoneIndex: 2, cameraIndex: 5, hour: 11, minute: 21, description: 'Movimiento en zona industrial B sin EPP', resolved: true },
    { event_type: 'persona', event_code: 'PERSONA_CAIDA', criticality: 'critica', status: 'resuelta', zoneIndex: 2, cameraIndex: 5, hour: 11, minute: 44, description: 'Posible tropiezo en pasillo de bodega', assigned_to: 'Maria Gonzalez', resolved: true, resolution_notes: 'Operario en buen estado — primeros auxilios' },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 7, cameraIndex: 3, hour: 11, minute: 58, description: 'Acceso peatonal sin credencial en area admin', resolved: true },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 12, minute: 6, description: 'Motocicleta a exceso de velocidad', plate: 'TUVW-11', resolved: true },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 6, hour: 12, minute: 15, description: 'Vehiculo bloqueando salida de emergencia', resolved: true },
    { event_type: 'objeto', event_code: 'OBJETO_ABANDONADO', criticality: 'media', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 12, minute: 28, description: 'Mochila en zona de espera de camiones', resolved: true, resolution_notes: 'Pertenencia de conductor identificado' },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 12, minute: 40, description: 'Proveedor ingreso por puerta lateral', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 6, cameraIndex: 7, hour: 13, minute: 2, description: 'Vibracion en sensor perimetral sur', resolved: true },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'media', status: 'resuelta', zoneIndex: 1, cameraIndex: 2, hour: 13, minute: 19, description: 'Personal de mantenimiento en nave A', resolved: true },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 13, minute: 37, description: 'Camion de carga supera limite en curva', plate: 'XYZA-56', resolved: true },
    { event_type: 'persona', event_code: 'PERSONA_CAIDA', criticality: 'alta', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 13, minute: 51, description: 'Persona sentada en suelo — evaluacion medica', resolved: true },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 14, minute: 9, description: 'Visitante sin escolta en zona restringida', resolved: true },
    { event_type: 'objeto', event_code: 'OBJETO_ABANDONADO', criticality: 'media', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 14, minute: 26, description: 'Herramientas en pasillo de logistica', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 5, cameraIndex: 0, hour: 14, minute: 48, description: 'Movimiento en franja boscosa perimetro norte', resolved: true },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 6, hour: 15, minute: 11, description: 'Camioneta en zona de visitas', resolved: true },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'media', status: 'resuelta', zoneIndex: 2, cameraIndex: 5, hour: 15, minute: 33, description: 'Operacion de montacargas en horario permitido', resolved: true },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 15, minute: 52, description: 'Vehiculo liviano en calle interna', plate: 'BCDE-90', resolved: true },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 16, minute: 8, description: 'Salida sin registro de visitante', resolved: true },
    { event_type: 'objeto', event_code: 'OBJETO_ABANDONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 3, cameraIndex: 4, hour: 16, minute: 24, description: 'Casco abandonado en muelle 2', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 6, cameraIndex: 7, hour: 16, minute: 41, description: 'Corte de cerco reportado por camara PTZ', resolved: true, resolution_notes: 'Danio menor — mantenimiento notificado' },
    { event_type: 'vehiculo', event_code: 'VEHICULO_ESTACIONADO', criticality: 'baja', status: 'resuelta', zoneIndex: 4, cameraIndex: 6, hour: 17, minute: 5, description: 'Cola de camiones al cierre de turno', resolved: true },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'media', status: 'resuelta', zoneIndex: 1, cameraIndex: 2, hour: 17, minute: 28, description: 'Personal extendiendo jornada en nave A', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'alta', status: 'resuelta', zoneIndex: 5, cameraIndex: 0, hour: 18, minute: 14, description: 'Actividad en perimetro durante cambio de turno', resolved: true },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'alta', status: 'resuelta', zoneIndex: 2, cameraIndex: 5, hour: 18, minute: 36, description: 'Movimiento en zona industrial fuera de horario', resolved: true },
    { event_type: 'acceso', event_code: 'ACCESO_NO_AUTORIZADO', criticality: 'media', status: 'resuelta', zoneIndex: 0, cameraIndex: 3, hour: 19, minute: 2, description: 'Ingreso nocturno sin autorizacion previa', resolved: true },
    { event_type: 'velocidad', event_code: 'VELOCIDAD_EXCESIVA', criticality: 'alta', status: 'resuelta', zoneIndex: 4, cameraIndex: 1, hour: 19, minute: 27, description: 'Camion de salida acelerando en rampa', resolved: true },
    { event_type: 'intrusion', event_code: 'INTRUSION_PERIMETRO', criticality: 'critica', status: 'resuelta', zoneIndex: 6, cameraIndex: 7, hour: 20, minute: 18, description: 'Sensor perimetral activado en sector sur', resolved: true },
    { event_type: 'movimiento', event_code: 'MOVIMIENTO_NOCTURNO', criticality: 'alta', status: 'resuelta', zoneIndex: 1, cameraIndex: 2, hour: 21, minute: 6, description: 'Ronda nocturna detecto puerta entreabierta', resolved: true },
  ],
  100
)

export const MOCK_ALERTS: Alert[] = [...MOCK_ALERTS_LIVE, ...MOCK_ALERTS_TODAY_HISTORICAL]

// NVRs mock
export const MOCK_NVRS: NVR[] = [
  { id: 1, name: 'NVR-Principal', ip: '192.168.1.10', port: 80, status: 'online', cameras_count: 4, tenant_id: 1 },
  { id: 2, name: 'NVR-Secundario', ip: '192.168.1.11', port: 80, status: 'online', cameras_count: 4, tenant_id: 1 },
]
