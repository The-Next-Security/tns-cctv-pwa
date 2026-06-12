-- Permite reactivar alertas cerradas (CLOSED → NEW) para volver al inicio del flujo operativo.
-- Idempotente: recrea el procedimiento con la transición adicional.

SOURCE db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql;
