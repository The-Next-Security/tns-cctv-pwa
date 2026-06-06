DELIMITER $$

CREATE EVENT ev_purge_expired_idempotency
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM ingress_idempotency
  WHERE expires_at < UTC_TIMESTAMP(3);

CREATE EVENT ev_purge_old_health_incidents
ON SCHEDULE EVERY 1 DAY
DO
  DELETE FROM health_incidents
  WHERE status = 'RESOLVED'
    AND resolved_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 12 MONTH);

DELIMITER ;
