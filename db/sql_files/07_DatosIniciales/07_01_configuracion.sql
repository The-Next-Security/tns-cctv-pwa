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
