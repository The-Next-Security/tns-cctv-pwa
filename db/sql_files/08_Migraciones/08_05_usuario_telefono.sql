-- =============================================================================
-- 08_05 — Teléfono de contacto en gen_usuario (escalación / llamadas)
-- =============================================================================
-- Ejecutar como usuario con permiso ALTER (root / DBA), NO como tns_cctv_app:
--   cd /ruta/al/repo
--   mysql -u root -p tns_cctv < db/sql_files/08_Migraciones/08_05_usuario_telefono.sql
-- =============================================================================

-- Idempotente en MySQL 5.7+ / 8.x (sin ADD COLUMN IF NOT EXISTS)
SET @col_exists = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'gen_usuario'
     AND COLUMN_NAME = 'telefono'
);

SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE gen_usuario ADD COLUMN telefono VARCHAR(32) NULL AFTER email',
  'SELECT ''gen_usuario.telefono ya existe'' AS info'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE gen_usuario SET telefono = '+56977432219' WHERE email = 'admin@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56991035567' WHERE email = 'supervisor@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56987654321' WHERE email = 'operador@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56976543210' WHERE email = 'recepcionista@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56228910045'  WHERE email = 'tecnico@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56988214430' WHERE email = 'seguridad@agrolivo.cl';
UPDATE gen_usuario SET telefono = '+56911112222' WHERE email = 'andres@thenextsecurity.cl';
UPDATE gen_usuario SET telefono = '+56933334444' WHERE email = 'felipe@thenextsecurity.cl';
UPDATE gen_usuario SET telefono = '+56955556666' WHERE email = 'raimundo@thenextsecurity.cl';
