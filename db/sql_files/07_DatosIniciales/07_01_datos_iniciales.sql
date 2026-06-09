-- =============================================================================
-- Datos iniciales completos para pruebas locales (UNICO archivo de inserts).
-- Incluye: configuracion del sistema, catalogo de permisos, tenant/sitio,
-- usuarios, permisos por usuario, fuentes, reglas, eventos, timeline e ingresos.
-- Idempotente (ON DUPLICATE KEY UPDATE). Editar directamente este archivo.
-- Timestamps fijos (2026-06-09) para que cada recreacion de la BD sea identica.
-- Contraseña de todos los usuarios: password123
-- =============================================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- --- Configuracion del sistema ---
INSERT INTO gen_configuracion_grupos (
  nombre,
  descripcion,
  orden,
  activo
) VALUES
  ('jwt', 'Autenticacion JWT y refresh tokens', 10, 1),
  ('system', 'Parametros generales del sistema', 20, 1),
  ('api', 'Version y URL base de la API', 30, 1),
  ('dahua', 'Integracion con dispositivos Dahua', 40, 1),
  ('storage', 'Object storage privado para evidencia', 50, 1),
  ('notifications', 'Entrega asincrona de notificaciones', 60, 1),
  ('health', 'Monitoreo de salud de fuentes', 70, 1),
  ('correlation', 'Correlacion de velocidad y admisiones', 80, 1)
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion),
  orden = VALUES(orden),
  activo = VALUES(activo);

INSERT INTO gen_configuracion_parametros (
  id_configuracion_grupos,
  ruta_completa,
  nombre_parametro,
  es_sensible,
  es_requerido,
  valor_default,
  activo
)
SELECT
  grupos.id_configuracion_grupos,
  semillas.ruta_completa,
  semillas.nombre_parametro,
  semillas.es_sensible,
  semillas.es_requerido,
  semillas.valor_default,
  1
FROM (
  SELECT 'jwt' grupo, 'jwt.secret' ruta_completa,
         'Clave privada access token' nombre_parametro,
         1 es_sensible, 1 es_requerido, NULL valor_default
  UNION ALL SELECT 'jwt', 'jwt.refresh_secret',
         'Clave privada refresh token', 1, 1, NULL
  UNION ALL SELECT 'jwt', 'jwt.expires_in',
         'Duracion access token', 0, 1, '15m'
  UNION ALL SELECT 'jwt', 'jwt.refresh_expires_in',
         'Duracion refresh token', 0, 1, '7d'
  UNION ALL SELECT 'system', 'system.environment',
         'Ambiente de ejecucion', 0, 1, 'development'
  UNION ALL SELECT 'system', 'system.timezone',
         'Zona horaria de negocio', 0, 1, 'America/Santiago'
  UNION ALL SELECT 'system', 'system.port',
         'Puerto HTTP', 0, 1, '3000'
  UNION ALL SELECT 'api', 'api.base_url',
         'URL base publica', 0, 1, 'http://localhost:3000/api/v1'
  UNION ALL SELECT 'api', 'api.version',
         'Version de API', 0, 1, 'v1'
  UNION ALL SELECT 'dahua', 'dahua.heartbeat_interval_s',
         'Intervalo heartbeat Dahua', 0, 1, '30'
  UNION ALL SELECT 'dahua', 'dahua.reconnect_delay_ms',
         'Espera de reconexion Dahua', 0, 1, '5000'
  UNION ALL SELECT 'dahua', 'dahua.token_refresh_margin_s',
         'Margen para renovar token Dahua', 0, 1, '60'
  UNION ALL SELECT 'storage', 'storage.base_url',
         'URL base object storage', 0, 1, 'http://localhost:9000'
  UNION ALL SELECT 'storage', 'storage.bucket',
         'Bucket privado de evidencia', 0, 1, 'tns-cctv-evidence'
  UNION ALL SELECT 'storage', 'storage.signed_url_ttl_s',
         'Duracion URL firmada', 0, 1, '300'
  UNION ALL SELECT 'notifications', 'notifications.email_provider',
         'Proveedor de email interno', 0, 0, 'disabled'
  UNION ALL SELECT 'notifications', 'notifications.webhook_timeout_ms',
         'Timeout de entrega', 0, 1, '5000'
  UNION ALL SELECT 'notifications', 'notifications.max_retries',
         'Reintentos maximos', 0, 1, '5'
  UNION ALL SELECT 'health', 'health.check_interval_s',
         'Intervalo de chequeo', 0, 1, '30'
  UNION ALL SELECT 'health', 'health.failure_threshold',
         'Umbral de fallas consecutivas', 0, 1, '3'
  UNION ALL SELECT 'correlation', 'correlation.window_minutes',
         'Ventana de correlacion', 0, 1, '120'
  UNION ALL SELECT 'correlation', 'correlation.confidence_threshold',
         'Umbral de confianza', 0, 1, '0.8500'
) AS semillas
INNER JOIN gen_configuracion_grupos AS grupos
  ON grupos.nombre = semillas.grupo
ON DUPLICATE KEY UPDATE
  id_configuracion_grupos = VALUES(id_configuracion_grupos),
  nombre_parametro = VALUES(nombre_parametro),
  es_sensible = VALUES(es_sensible),
  es_requerido = VALUES(es_requerido),
  valor_default = VALUES(valor_default),
  activo = VALUES(activo);

INSERT INTO gen_configuracion_valores (
  id_configuracion_parametros,
  valor,
  version,
  activo
)
SELECT
  parametros.id_configuracion_parametros,
  parametros.valor_default,
  1,
  1
FROM gen_configuracion_parametros AS parametros
LEFT JOIN gen_configuracion_valores AS valores
  ON valores.id_configuracion_parametros = parametros.id_configuracion_parametros
 AND valores.activo = 1
WHERE parametros.activo = 1
  AND parametros.es_sensible = 0
  AND parametros.valor_default IS NOT NULL
  AND valores.id_configuracion_valores IS NULL;

-- --- Catalogo de permisos ---
INSERT INTO gen_permiso (id_permiso, code, descripcion, modulo) VALUES
  ('PE000000000000000000000001', 'alerts.view',            'Ver alertas en la consola operativa',        'operacion'),
  ('PE000000000000000000000002', 'alerts.attend',          'Atender, escalar y descartar alertas',       'operacion'),
  ('PE000000000000000000000003', 'vehicle_entries.create', 'Registrar ingresos vehiculares',             'recepcion'),
  ('PE000000000000000000000004', 'vehicle_entries.view',   'Consultar ingresos vehiculares',             'recepcion'),
  ('PE000000000000000000000005', 'case_files.view',        'Ver expedientes',                            'expedientes'),
  ('PE000000000000000000000006', 'case_files.resolve',     'Resolver expedientes',                       'expedientes'),
  ('PE000000000000000000000007', 'rules.manage',           'Gestionar reglas operativas',                'reglas'),
  ('PE000000000000000000000008', 'reports.view',           'Ver reportes',                               'reportes'),
  ('PE000000000000000000000009', 'users.manage',           'Gestionar usuarios y permisos',              'admin'),
  ('PE000000000000000000000010', 'nvrs.manage',            'Gestionar NVRs, camaras y zonas',            'admin'),
  ('PE000000000000000000000011', 'config.manage',          'Gestionar configuracion del sistema',        'admin'),
  ('PE000000000000000000000012', 'health.view',            'Ver salud tecnica de fuentes',               'salud')
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion),
  modulo = VALUES(modulo);

-- --- Datos demo Agrolivo + usuarios TNS ---
INSERT INTO gen_tenant (id_tenant, code, name, status) VALUES
  ('TN000000000000000000000001', 'agrolivo', 'Parque Industrial Agrolivo', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);

INSERT INTO gen_site (id_site, id_tenant, code, name, timezone, status) VALUES
  ('ST000000000000000000000001', 'TN000000000000000000000001', 'main', 'Parque Industrial Agrolivo', 'America/Santiago', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status);

INSERT INTO gen_usuario (id_usuario, id_tenant, email, nombre, apellido, password_hash, status) VALUES
  ('US000000000000000000000001', 'TN000000000000000000000001', 'admin@agrolivo.cl', 'Carlos', 'Rodriguez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000002', 'TN000000000000000000000001', 'supervisor@agrolivo.cl', 'Maria', 'Gonzalez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000003', 'TN000000000000000000000001', 'operador@agrolivo.cl', 'Juan', 'Perez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000004', 'TN000000000000000000000001', 'recepcionista@agrolivo.cl', 'Ana', 'Silva', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000005', 'TN000000000000000000000001', 'tecnico@agrolivo.cl', 'Roberto', 'Diaz', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000006', 'TN000000000000000000000001', 'andres@thenextsecurity.cl', 'Andres', 'Vasquez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000007', 'TN000000000000000000000001', 'felipe@thenextsecurity.cl', 'Felipe', 'Vásquez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE'),
  ('US000000000000000000000008', 'TN000000000000000000000001', 'raimundo@thenextsecurity.cl', 'Raimundo', 'Sanchez', '$2b$10$wi0P0vi.czpxshEJjF.WlugYv3XG4R3ZMIXjahzJ1hxiYVW3b2zUK', 'ACTIVE')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), apellido=VALUES(apellido), password_hash=VALUES(password_hash), status=VALUES(status);

INSERT INTO gen_acceso_sitio (id_usuario, id_site) VALUES
  ('US000000000000000000000001', 'ST000000000000000000000001'),
  ('US000000000000000000000002', 'ST000000000000000000000001'),
  ('US000000000000000000000003', 'ST000000000000000000000001'),
  ('US000000000000000000000004', 'ST000000000000000000000001'),
  ('US000000000000000000000005', 'ST000000000000000000000001'),
  ('US000000000000000000000006', 'ST000000000000000000000001'),
  ('US000000000000000000000007', 'ST000000000000000000000001'),
  ('US000000000000000000000008', 'ST000000000000000000000001')
ON DUPLICATE KEY UPDATE id_site=VALUES(id_site);

INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000001', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view', 'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view', 'users.manage', 'nvrs.manage', 'config.manage', 'health.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000002', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.view', 'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view', 'health.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000003', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000004', id_permiso FROM gen_permiso WHERE code IN ('vehicle_entries.create', 'vehicle_entries.view', 'case_files.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000005', id_permiso FROM gen_permiso WHERE code IN ('health.view', 'nvrs.manage', 'config.manage', 'reports.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000006', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view', 'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view', 'users.manage', 'nvrs.manage', 'config.manage', 'health.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000007', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view', 'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view', 'users.manage', 'nvrs.manage', 'config.manage', 'health.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;
INSERT INTO gen_usuario_permiso (id_usuario, id_permiso)
SELECT 'US000000000000000000000008', id_permiso FROM gen_permiso WHERE code IN ('alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view', 'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view', 'users.manage', 'nvrs.manage', 'config.manage', 'health.view')
ON DUPLICATE KEY UPDATE granted_at = granted_at;

INSERT INTO src_fuente (id_fuente, id_tenant, id_site, source_code, source_type, display_name, status, metadata_json) VALUES
  ('SN000000000000000000000001', 'TN000000000000000000000001', 'ST000000000000000000000001', 'nvr-principal', 'NVR', 'NVR-Principal', 'ACTIVE', '{"ip":"192.168.1.10","port":80}'),
  ('SN000000000000000000000002', 'TN000000000000000000000001', 'ST000000000000000000000001', 'nvr-secundario', 'NVR', 'NVR-Secundario', 'ACTIVE', '{"ip":"192.168.1.11","port":80}'),
  ('SC000000000000000000000001', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-per-n01', 'CAMERA', 'CAM-PER-N01', 'ACTIVE', '{"ip":"192.168.1.101","channel":1,"nvr_code":"nvr-principal","zone_code":"zone-6","zone_name":"Perimetro Norte"}'),
  ('SC000000000000000000000002', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-est-01', 'CAMERA', 'CAM-EST-01', 'ACTIVE', '{"ip":"192.168.1.102","channel":2,"nvr_code":"nvr-principal","zone_code":"zone-5","zone_name":"Estacionamiento"}'),
  ('SC000000000000000000000003', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-ind-a01', 'CAMERA', 'CAM-IND-A01', 'ACTIVE', '{"ip":"192.168.1.103","channel":3,"nvr_code":"nvr-principal","zone_code":"zone-2","zone_name":"Zona Industrial A"}'),
  ('SC000000000000000000000004', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-ent-01', 'CAMERA', 'CAM-ENT-01', 'ACTIVE', '{"ip":"192.168.1.104","channel":4,"nvr_code":"nvr-principal","zone_code":"zone-1","zone_name":"Entrada Principal"}'),
  ('SC000000000000000000000005', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-log-01', 'CAMERA', 'CAM-LOG-01', 'ACTIVE', '{"ip":"192.168.1.105","channel":5,"nvr_code":"nvr-secundario","zone_code":"zone-4","zone_name":"Zona Logistica"}'),
  ('SC000000000000000000000006', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-ind-b01', 'CAMERA', 'CAM-IND-B01', 'ACTIVE', '{"ip":"192.168.1.106","channel":6,"nvr_code":"nvr-secundario","zone_code":"zone-3","zone_name":"Zona Industrial B"}'),
  ('SC000000000000000000000007', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-est-02', 'CAMERA', 'CAM-EST-02', 'ACTIVE', '{"ip":"192.168.1.107","channel":7,"nvr_code":"nvr-secundario","zone_code":"zone-5","zone_name":"Estacionamiento"}'),
  ('SC000000000000000000000008', 'TN000000000000000000000001', 'ST000000000000000000000001', 'cam-per-s01', 'CAMERA', 'CAM-PER-S01', 'ACTIVE', '{"ip":"192.168.1.108","channel":8,"nvr_code":"nvr-secundario","zone_code":"zone-7","zone_name":"Perimetro Sur"}')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), status=VALUES(status), metadata_json=VALUES(metadata_json);

INSERT INTO ale_regla (id_regla, id_tenant, id_site, name, enabled, priority_order, conditions_json, actions_json, timezone, created_by_id_usuario, updated_by_id_usuario) VALUES
  ('RG000000000000000000000001', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Intrusion perimetral nocturna', 1, 10, '{"event_codes":["CrossLineDetection","CrossRegionDetection"],"zone_code":"zone-6","criticality":"critica","time_from":"22:00","time_to":"06:00"}', '{"priority_popup":true,"notify_admin":true,"record_evidence":true,"can_escalate":true,"escalation_roles":["responsable_seguridad","admin_parque"]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000002', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Merodeo perimetral', 1, 20, '{"event_codes":["WanderDetection"],"zone_code":"zone-7","criticality":"alta","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":true,"notify_admin":true,"record_evidence":false,"can_escalate":true,"escalation_roles":["responsable_seguridad","admin_parque"]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000003', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Persona fuera de horario (IA)', 1, 30, '{"event_codes":["SmartMotionHuman"],"zone_code":"zone-2","criticality":"media","time_from":"20:00","time_to":"06:00"}', '{"priority_popup":true,"notify_admin":false,"record_evidence":false,"can_escalate":false,"escalation_roles":[]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000004', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Acceso no autorizado entrada', 1, 40, '{"event_codes":["CrossRegionDetection"],"zone_code":"zone-1","criticality":"alta","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":true,"notify_admin":true,"record_evidence":false,"can_escalate":true,"escalation_roles":["responsable_seguridad","admin_parque"]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000005', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Objeto abandonado en transito', 1, 50, '{"event_codes":["LeftDetection"],"zone_code":"zone-4","criticality":"media","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":true,"notify_admin":false,"record_evidence":false,"can_escalate":false,"escalation_roles":[]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000006', 'TN000000000000000000000001', 'ST000000000000000000000001', 'ANPR ingreso recepcion', 1, 60, '{"event_codes":["TrafficJunction"],"zone_code":"zone-1","criticality":"baja","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":false,"notify_admin":false,"record_evidence":true,"can_escalate":false,"escalation_roles":[]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000007', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Exceso de velocidad Camino El Olivo', 1, 70, '{"event_codes":["TrafficOverSpeed"],"zone_code":null,"criticality":"alta","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":true,"notify_admin":true,"record_evidence":true,"can_escalate":true,"escalation_roles":["responsable_seguridad","admin_parque"]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000008', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Camara cubierta / sabotaje', 1, 80, '{"event_codes":["VideoBlind"],"zone_code":null,"criticality":"alta","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":true,"notify_admin":true,"record_evidence":false,"can_escalate":true,"escalation_roles":["responsable_seguridad","admin_parque"]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001'),
  ('RG000000000000000000000009', 'TN000000000000000000000001', 'ST000000000000000000000001', 'Salud tecnica (perdida de senal)', 0, 90, '{"event_codes":["VideoLoss","StorageFailure"],"zone_code":null,"criticality":"media","time_from":"00:00","time_to":"23:59"}', '{"priority_popup":false,"notify_admin":true,"record_evidence":false,"can_escalate":false,"escalation_roles":[]}', 'America/Santiago', 'US000000000000000000000001', 'US000000000000000000000001')
ON DUPLICATE KEY UPDATE name=VALUES(name), enabled=VALUES(enabled), conditions_json=VALUES(conditions_json), actions_json=VALUES(actions_json);

INSERT INTO ale_evento (id_evento, id_tenant, id_site, id_fuente, external_event_id, event_type, severity, zone_code, plate, occurred_at, state, critical, priority, payload_version, raw_payload_json, matched_rule_ids_json, decision_reason) VALUES
  ('EV000000000000000000000001', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000001', 'ext-1', 'CrossLineDetection', 5, 'zone-6', NULL, '2026-06-09 11:58:00.000', 'NEW', 1, 100, '1.0', '{"event_code":"CrossLineDetection","channel":1,"plate":null}', '["RG000000000000000000000001"]', NULL),
  ('EV000000000000000000000002', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000004', 'ext-2', 'CrossRegionDetection', 4, 'zone-1', NULL, '2026-06-09 11:56:00.000', 'NEW', 0, 80, '1.0', '{"event_code":"CrossRegionDetection","channel":4,"plate":null}', '["RG000000000000000000000004"]', NULL),
  ('EV000000000000000000000003', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000002', 'ext-3', 'TrafficOverSpeed', 4, NULL, 'BCDF-12', '2026-06-09 11:55:00.000', 'NEW', 0, 80, '1.0', '{"event_code":"TrafficOverSpeed","channel":2,"plate":"BCDF-12"}', '["RG000000000000000000000007"]', NULL),
  ('EV000000000000000000000004', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000005', 'ext-4', 'LeftDetection', 3, 'zone-4', NULL, '2026-06-09 11:52:00.000', 'NEW', 0, 60, '1.0', '{"event_code":"LeftDetection","channel":5,"plate":null}', '["RG000000000000000000000005"]', NULL),
  ('EV000000000000000000000005', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000003', 'ext-5', 'SmartMotionHuman', 3, 'zone-2', NULL, '2026-06-09 11:50:00.000', 'NEW', 0, 60, '1.0', '{"event_code":"SmartMotionHuman","channel":3,"plate":null}', '["RG000000000000000000000003"]', NULL),
  ('EV000000000000000000000006', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000008', 'ext-6', 'WanderDetection', 4, 'zone-7', NULL, '2026-06-09 11:40:00.000', 'IN_REVIEW', 0, 80, '1.0', '{"event_code":"WanderDetection","channel":8,"plate":null}', '["RG000000000000000000000002"]', NULL),
  ('EV000000000000000000000007', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000006', 'ext-7', 'VideoBlind', 4, NULL, NULL, '2026-06-09 11:35:00.000', 'IN_REVIEW', 0, 80, '1.0', '{"event_code":"VideoBlind","channel":6,"plate":null}', '["RG000000000000000000000008"]', NULL),
  ('EV000000000000000000000008', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000004', 'ext-8', 'TrafficJunction', 2, 'zone-1', 'BCDF-12', '2026-06-09 11:15:00.000', 'CLOSED', 0, 40, '1.0', '{"event_code":"TrafficJunction","channel":4,"plate":"BCDF-12"}', '["RG000000000000000000000006"]', 'Patente correlacionada con ingreso'),
  ('EV000000000000000000000009', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000008', 'ext-9', 'WanderDetection', 4, 'zone-7', NULL, '2026-06-09 10:30:00.000', 'CLOSED', 0, 80, '1.0', '{"event_code":"WanderDetection","channel":8,"plate":null}', '["RG000000000000000000000002"]', 'Falsa alarma — animal silvestre'),
  ('EV000000000000000000000010', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000001', 'ext-10', 'CrossLineDetection', 5, 'zone-6', NULL, '2026-06-09 07:00:00.000', 'CLOSED', 1, 100, '1.0', '{"event_code":"CrossLineDetection","channel":1,"plate":null}', '["RG000000000000000000000001"]', 'Escalada a supervisor — persona identificada'),
  ('EV000000000000000000000011', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000002', 'ext-11', 'TrafficOverSpeed', 4, NULL, 'KLMN-34', '2026-06-09 05:00:00.000', 'CLOSED', 0, 80, '1.0', '{"event_code":"TrafficOverSpeed","channel":2,"plate":"KLMN-34"}', '["RG000000000000000000000007"]', 'Notificado al conductor'),
  ('EV000000000000000000000012', 'TN000000000000000000000001', 'ST000000000000000000000001', 'SC000000000000000000000004', 'ext-12', 'CrossRegionDetection', 4, 'zone-1', NULL, '2026-06-09 04:00:00.000', 'CLOSED', 0, 80, '1.0', '{"event_code":"CrossRegionDetection","channel":4,"plate":null}', '["RG000000000000000000000004"]', 'Visitante registrado en recepcion')
ON DUPLICATE KEY UPDATE state=VALUES(state), decision_reason=VALUES(decision_reason);

INSERT INTO log_evento_timeline (id_evento_timeline, id_tenant, id_evento, action_type, from_state, to_state, decision, comment_text, actor_type, actor_id_usuario, occurred_at) VALUES
  ('TL000000000000000000000001', 'TN000000000000000000000001', 'EV000000000000000000000001', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:58:00.000'),
  ('TL000000000000000000000002', 'TN000000000000000000000001', 'EV000000000000000000000002', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:56:00.000'),
  ('TL000000000000000000000003', 'TN000000000000000000000001', 'EV000000000000000000000003', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:55:00.000'),
  ('TL000000000000000000000004', 'TN000000000000000000000001', 'EV000000000000000000000004', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:52:00.000'),
  ('TL000000000000000000000005', 'TN000000000000000000000001', 'EV000000000000000000000005', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:50:00.000'),
  ('TL000000000000000000000006', 'TN000000000000000000000001', 'EV000000000000000000000006', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:40:00.000'),
  ('TL000000000000000000000007', 'TN000000000000000000000001', 'EV000000000000000000000006', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000001', '2026-06-09 11:41:00.000'),
  ('TL000000000000000000000008', 'TN000000000000000000000001', 'EV000000000000000000000007', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:35:00.000'),
  ('TL000000000000000000000009', 'TN000000000000000000000001', 'EV000000000000000000000007', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000002', '2026-06-09 11:36:00.000'),
  ('TL000000000000000000000010', 'TN000000000000000000000001', 'EV000000000000000000000008', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 11:15:00.000'),
  ('TL000000000000000000000011', 'TN000000000000000000000001', 'EV000000000000000000000008', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000001', '2026-06-09 11:16:00.000'),
  ('TL000000000000000000000012', 'TN000000000000000000000001', 'EV000000000000000000000008', 'STATE_CHANGE', 'IN_REVIEW', 'CLOSED', 'CONFIRMED', 'Patente correlacionada con ingreso', 'USER', 'US000000000000000000000001', '2026-06-09 11:17:00.000'),
  ('TL000000000000000000000013', 'TN000000000000000000000001', 'EV000000000000000000000009', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 10:30:00.000'),
  ('TL000000000000000000000014', 'TN000000000000000000000001', 'EV000000000000000000000009', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000002', '2026-06-09 10:31:00.000'),
  ('TL000000000000000000000015', 'TN000000000000000000000001', 'EV000000000000000000000009', 'STATE_CHANGE', 'IN_REVIEW', 'CLOSED', 'FALSE_POSITIVE', 'Falsa alarma — animal silvestre', 'USER', 'US000000000000000000000002', '2026-06-09 10:32:00.000'),
  ('TL000000000000000000000016', 'TN000000000000000000000001', 'EV000000000000000000000010', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 07:00:00.000'),
  ('TL000000000000000000000017', 'TN000000000000000000000001', 'EV000000000000000000000010', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000001', '2026-06-09 07:01:00.000'),
  ('TL000000000000000000000018', 'TN000000000000000000000001', 'EV000000000000000000000010', 'STATE_CHANGE', 'IN_REVIEW', 'CLOSED', 'ESCALATED', 'Escalada a supervisor — persona identificada', 'USER', 'US000000000000000000000001', '2026-06-09 07:02:00.000'),
  ('TL000000000000000000000019', 'TN000000000000000000000001', 'EV000000000000000000000011', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 05:00:00.000'),
  ('TL000000000000000000000020', 'TN000000000000000000000001', 'EV000000000000000000000011', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000001', '2026-06-09 05:01:00.000'),
  ('TL000000000000000000000021', 'TN000000000000000000000001', 'EV000000000000000000000011', 'STATE_CHANGE', 'IN_REVIEW', 'CLOSED', 'CONFIRMED', 'Notificado al conductor', 'USER', 'US000000000000000000000001', '2026-06-09 05:02:00.000'),
  ('TL000000000000000000000022', 'TN000000000000000000000001', 'EV000000000000000000000012', 'INGESTED', NULL, 'NEW', NULL, NULL, 'SYSTEM', NULL, '2026-06-09 04:00:00.000'),
  ('TL000000000000000000000023', 'TN000000000000000000000001', 'EV000000000000000000000012', 'STATE_CHANGE', 'NEW', 'IN_REVIEW', 'TOMAR', 'Atendida por operador', 'USER', 'US000000000000000000000002', '2026-06-09 04:01:00.000'),
  ('TL000000000000000000000024', 'TN000000000000000000000001', 'EV000000000000000000000012', 'STATE_CHANGE', 'IN_REVIEW', 'CLOSED', 'FALSE_POSITIVE', 'Visitante registrado en recepcion', 'USER', 'US000000000000000000000002', '2026-06-09 04:02:00.000')
ON DUPLICATE KEY UPDATE comment_text=VALUES(comment_text);

INSERT INTO adm_ingreso (id_ingreso, id_tenant, id_site, plate, visitor_id, visitor_name, destination_company, source_type, entry_at, notes, review_required, created_by_id_usuario) VALUES
  ('IG000000000000000000000001', 'TN000000000000000000000001', 'ST000000000000000000000001', 'BCDF-12', '12.345.678-9', 'Juan Perez', 'Transportes del Valle', 'HYBRID', '2026-06-09 10:00:00.000', 'Transporta materiales de construccion', 0, 'US000000000000000000000004'),
  ('IG000000000000000000000002', 'TN000000000000000000000001', 'ST000000000000000000000001', 'WXYZ-98', '13.456.789-0', 'Maria Gonzalez', 'LogiCentral', 'ANPR', '2026-06-09 10:30:00.000', NULL, 0, 'US000000000000000000000004'),
  ('IG000000000000000000000003', 'TN000000000000000000000001', 'ST000000000000000000000001', 'LMNO-45', '14.567.890-1', 'Pedro Martinez', 'DisNorte', 'MANUAL', '2026-06-09 11:00:00.000', NULL, 0, 'US000000000000000000000004'),
  ('IG000000000000000000000004', 'TN000000000000000000000001', 'ST000000000000000000000001', 'HIJK-67', '15.678.901-2', 'Ana Silva', 'AliSur', 'HYBRID', '2026-06-09 11:15:00.000', NULL, 0, 'US000000000000000000000004'),
  ('IG000000000000000000000005', 'TN000000000000000000000001', 'ST000000000000000000000001', 'QRST-23', '16.789.012-3', 'Roberto Diaz', 'MetalInd', 'ANPR', '2026-06-09 11:40:00.000', 'Equipo de mantenimiento', 0, 'US000000000000000000000004')
ON DUPLICATE KEY UPDATE notes=VALUES(notes), destination_company=VALUES(destination_company);

