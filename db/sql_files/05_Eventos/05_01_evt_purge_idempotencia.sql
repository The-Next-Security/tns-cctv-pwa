DROP EVENT IF EXISTS evt_purge_idempotencia;

DELIMITER $$

CREATE EVENT evt_purge_idempotencia
  ON SCHEDULE EVERY 1 DAY
  STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
  ON COMPLETION PRESERVE
  ENABLE
  COMMENT 'Purga claves de idempotencia expiradas'
DO
  DELETE FROM src_idempotencia_ingesta
   WHERE expires_at < UTC_TIMESTAMP(3)$$

DELIMITER ;
