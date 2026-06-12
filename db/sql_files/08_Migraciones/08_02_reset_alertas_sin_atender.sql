-- =============================================================================
-- 08_02 — Reset demo: todas las alertas en estado sin atender (NEW / pendiente)
-- =============================================================================
-- Deja los 12 eventos seed listos para probar el flujo completo de gestión
-- (tomar, escalar, descartar, resolver) desde cero.
--
-- Ejecución (cliente mysql interactivo):
--   mysql> USE tns_cctv;
--   mysql> SOURCE db/sql_files/08_Migraciones/08_02_reset_alertas_sin_atender.sql;
-- =============================================================================

UPDATE ale_evento
   SET state = 'NEW',
       decision_reason = NULL
 WHERE id_tenant = 'TN000000000000000000000001';

DELETE FROM log_evento_timeline
 WHERE id_tenant = 'TN000000000000000000000001'
   AND action_type = 'STATE_CHANGE';
