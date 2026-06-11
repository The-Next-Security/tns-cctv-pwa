-- =============================================================================
-- 08_04 — Migración: ESCALATING en log_evento_timeline (from_state / to_state)
-- =============================================================================
-- Alinea el timeline con ale_evento tras 08_03_estado_escalating.sql
-- =============================================================================

ALTER TABLE log_evento_timeline
  MODIFY from_state ENUM('NEW','IN_REVIEW','ESCALATING','CLOSED') NULL,
  MODIFY to_state   ENUM('NEW','IN_REVIEW','ESCALATING','CLOSED') NULL;
