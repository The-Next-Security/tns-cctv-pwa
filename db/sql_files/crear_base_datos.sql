-- Ejecutar desde la raiz del repositorio:
-- mysql --default-character-set=utf8mb4 -u <usuario> -p < db/SQL_FILES/crear_base_datos.sql

CREATE DATABASE IF NOT EXISTS tns_cctv
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cctv;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
SET sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_01_tablas_gen.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_02_tablas_src.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_03_tablas_ale.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_04_tablas_log.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_05_tablas_sal.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_06_tablas_adm.sql;
SOURCE db/SQL_FILES/01_CreacionDesdeCero/01_07_tablas_dah.sql;
SOURCE db/SQL_FILES/02_Funciones/02_01_fun_normalize_plate.sql;
SOURCE db/SQL_FILES/04_StoredProcedures/04_01_stpr_register_event_state.sql;
SOURCE db/SQL_FILES/05_Eventos/05_01_evt_purge_idempotencia.sql;
SOURCE db/SQL_FILES/07_DatosIniciales/07_01_configuracion.sql;
