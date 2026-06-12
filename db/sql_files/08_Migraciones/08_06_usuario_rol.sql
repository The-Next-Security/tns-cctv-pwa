-- =============================================================================
-- 08_06 — Rol de presentación persistido en gen_usuario
-- =============================================================================
-- Ejecutar como usuario con permiso ALTER (root / DBA):
--   mysql -u root -p tns_cctv < db/sql_files/08_Migraciones/08_06_usuario_rol.sql
-- =============================================================================

SET @col_exists = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'gen_usuario'
     AND COLUMN_NAME = 'rol'
);

SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE gen_usuario ADD COLUMN rol VARCHAR(32) NOT NULL DEFAULT ''visualizador'' AFTER telefono',
  'SELECT ''gen_usuario.rol ya existe'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE gen_usuario SET rol = 'admin_parque'           WHERE email = 'admin@agrolivo.cl';
UPDATE gen_usuario SET rol = 'supervisor'             WHERE email = 'supervisor@agrolivo.cl';
UPDATE gen_usuario SET rol = 'vigilante'              WHERE email = 'operador@agrolivo.cl';
UPDATE gen_usuario SET rol = 'recepcionista'          WHERE email = 'recepcionista@agrolivo.cl';
UPDATE gen_usuario SET rol = 'tecnico'                WHERE email = 'tecnico@agrolivo.cl';
UPDATE gen_usuario SET rol = 'responsable_seguridad'  WHERE email = 'seguridad@agrolivo.cl';
UPDATE gen_usuario SET rol = 'admin_parque'           WHERE email = 'andres@thenextsecurity.cl';
UPDATE gen_usuario SET rol = 'admin_parque'           WHERE email = 'felipe@thenextsecurity.cl';
UPDATE gen_usuario SET rol = 'admin_parque'           WHERE email = 'raimundo@thenextsecurity.cl';
