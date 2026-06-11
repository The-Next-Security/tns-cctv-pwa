-- =============================================================================
-- 08_01 — Migración: columnas de recepción en adm_ingreso
-- =============================================================================
-- Agrega las columnas que la consola de Recepción necesita para persistir el
-- flujo completo de ingreso/salida vehicular:
--   - vehicle_type    : tipo declarado del vehículo
--   - anpr_confidence : confianza (0-100) de la lectura ANPR si aplica
--   - exit_at         : registro de salida del vehículo
--
-- Aplicar SOLO sobre bases creadas antes del 2026-06-09 (las creaciones nuevas
-- con 01_06_tablas_adm.sql ya incluyen estas columnas).
--
-- Ejecución (cliente mysql interactivo, desde la raíz del repo):
--   mysql> USE tns_cctv;
--   mysql> SOURCE db/sql_files/08_Migraciones/08_01_adm_ingreso_recepcion.sql;
-- =============================================================================

ALTER TABLE adm_ingreso
  ADD COLUMN vehicle_type    ENUM('PARTICULAR','CAMION','MOTO','UTILITARIO','OTRO') NULL AFTER source_type,
  ADD COLUMN anpr_confidence TINYINT UNSIGNED NULL AFTER vehicle_type,
  ADD COLUMN exit_at         DATETIME(3) NULL AFTER entry_at;

-- Datos demo: completar tipo de vehículo y confianza ANPR de los 5 ingresos seed.
UPDATE adm_ingreso SET vehicle_type = 'CAMION',     anpr_confidence = 93 WHERE id_ingreso = 'IG000000000000000000000001';
UPDATE adm_ingreso SET vehicle_type = 'CAMION',     anpr_confidence = 96 WHERE id_ingreso = 'IG000000000000000000000002';
UPDATE adm_ingreso SET vehicle_type = 'UTILITARIO', anpr_confidence = NULL WHERE id_ingreso = 'IG000000000000000000000003';
UPDATE adm_ingreso SET vehicle_type = 'PARTICULAR', anpr_confidence = 91 WHERE id_ingreso = 'IG000000000000000000000004';
UPDATE adm_ingreso SET vehicle_type = 'UTILITARIO', anpr_confidence = 95 WHERE id_ingreso = 'IG000000000000000000000005';

-- Una salida registrada para que la vista "Vehículos en el parque" tenga variedad.
UPDATE adm_ingreso SET exit_at = '2026-06-09 11:25:00.000' WHERE id_ingreso = 'IG000000000000000000000003';
