-- =============================================================================
-- 08_03 — Migración: estado ESCALATING en ale_evento
-- =============================================================================
-- Agrega el estado intermedio ESCALATING (escalado activo, no terminal).
-- Requiere re-aplicar el stored procedure de transiciones:
--   SOURCE db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql;
--
-- Ejecución (cliente mysql interactivo):
--   mysql> USE tns_cctv;
--   mysql> SOURCE db/sql_files/08_Migraciones/08_03_estado_escalating.sql;
--   mysql> SOURCE db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql;
-- =============================================================================

ALTER TABLE ale_evento
  MODIFY state ENUM('NEW','IN_REVIEW','ESCALATING','CLOSED') NOT NULL DEFAULT 'NEW';
