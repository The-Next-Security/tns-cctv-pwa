-- =============================================================================
-- TNS CCTV PWA - Orquestador de creacion de la base de datos `tns_cctv`
-- =============================================================================
-- MySQL 9.x NO permite SOURCE anidado: NO ejecutes este archivo con
--   SOURCE db/sql_files/crear_base_datos.sql
-- Copia y pega TODO el contenido de este archivo en el prompt mysql>,
-- o ejecuta cada linea SOURCE de abajo, una por una, en orden.
--
-- Cliente mysql interactivo, desde la raiz del repositorio:
--     mysql --default-character-set=utf8mb4 -u root -p
-- =============================================================================

CREATE DATABASE IF NOT EXISTS tns_cctv
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cctv;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
SET sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

SOURCE db/sql_files/01_CreacionDesdeCero/01_01_tablas_gen.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_02_tablas_src.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_03_tablas_ale.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_04_tablas_log.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_05_tablas_sal.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_06_tablas_adm.sql
SOURCE db/sql_files/01_CreacionDesdeCero/01_07_tablas_dah.sql
SOURCE db/sql_files/02_Funciones/02_01_fun_normalize_plate.sql
SOURCE db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql
SOURCE db/sql_files/05_Eventos/05_01_evt_purge_idempotencia.sql
SOURCE db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql
