-- 08_09: M6 — salud de fuentes (HANDOFF §2 Paso 4).
-- Heartbeat por fuente + umbrales configurables en gen_configuracion_*:
--   health.nvr_heartbeat_max_s   (300 s = 5 min → DEGRADED)
--   health.incident_threshold_min (15 min, configurable por el PO → DOWN/incidente)

USE tns_cctv;

ALTER TABLE src_fuente
  ADD COLUMN last_heartbeat_at DATETIME(3) NULL AFTER metadata_json,
  ADD INDEX idx_fuente_heartbeat (source_type, last_heartbeat_at);

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
  0,
  1,
  semillas.valor_default,
  1
FROM (
  SELECT 'health' grupo, 'health.nvr_heartbeat_max_s' ruta_completa,
         'Heartbeat maximo NVR (s) antes de DEGRADED' nombre_parametro,
         '300' valor_default
  UNION ALL SELECT 'health', 'health.incident_threshold_min',
         'Minutos sin heartbeat antes de incidente (DOWN)', '15'
) AS semillas
INNER JOIN gen_configuracion_grupos AS grupos
  ON grupos.nombre = semillas.grupo
ON DUPLICATE KEY UPDATE
  nombre_parametro = VALUES(nombre_parametro),
  valor_default = VALUES(valor_default),
  activo = VALUES(activo);
