-- =============================================================================
-- TNS CCTV PWA - Orquestador de creacion de la base de datos `tns_cctv`
-- =============================================================================
-- COMO EJECUTAR (IMPORTANTE):
--   Los comandos SOURCE pertenecen al CLIENTE mysql y solo se interpretan en
--   modo interactivo. NO funcionan al canalizar el archivo por stdin
--   (`mysql < crear_base_datos.sql` falla con error de sintaxis en SOURCE).
--
--   Ejecutar desde la RAIZ del repositorio:
--       mysql --default-character-set=utf8mb4 -u root -p
--       mysql> SOURCE db/sql_files/crear_base_datos.sql;
--
--   Las rutas SOURCE son relativas al directorio de trabajo del cliente mysql,
--   por eso DEBES iniciar el cliente desde la raiz del repositorio.
--
-- Este orquestador crea el esquema completo (bundle prefijado), las rutinas y
-- TODOS los datos iniciales necesarios para pruebas locales en un solo archivo
-- de inserts (`07_01_datos_iniciales.sql`).
-- Es idempotente: puede re-ejecutarse sin error (IF NOT EXISTS / ON DUPLICATE KEY).
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tns_cctv
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cctv;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
SET sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- 1) Esquema: tablas por modulo (gen, src, ale, log, sal, adm, dah)
SOURCE db/sql_files/01_CreacionDesdeCero/01_01_tablas_gen.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_02_tablas_src.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_03_tablas_ale.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_04_tablas_log.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_05_tablas_sal.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_06_tablas_adm.sql;
SOURCE db/sql_files/01_CreacionDesdeCero/01_07_tablas_dah.sql;

-- 2) Funciones, procedimientos almacenados y eventos
SOURCE db/sql_files/02_Funciones/02_01_fun_normalize_plate.sql;
SOURCE db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql;
SOURCE db/sql_files/05_Eventos/05_01_evt_purge_idempotencia.sql;

-- 3) Datos iniciales completos (config, permisos, tenant, usuarios, eventos, ingresos)
SOURCE db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql;
