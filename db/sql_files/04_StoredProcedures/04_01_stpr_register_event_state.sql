DROP PROCEDURE IF EXISTS stpr_register_event_state;

DELIMITER $$

CREATE PROCEDURE stpr_register_event_state(
  IN p_id_evento_timeline  CHAR(26),
  IN p_id_tenant           CHAR(26),
  IN p_id_evento           CHAR(26),
  IN p_actor_type          VARCHAR(16),
  IN p_actor_id_usuario    CHAR(26),
  IN p_to_state            VARCHAR(16),
  IN p_decision            VARCHAR(128),
  IN p_comment_text        TEXT,
  IN p_request_id          VARCHAR(64)
)
BEGIN
  DECLARE v_from_state VARCHAR(16);
  DECLARE v_not_found TINYINT(1) DEFAULT 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_actor_type NOT IN ('USER', 'SYSTEM', 'CONNECTOR') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'INVALID_ACTOR_TYPE';
  END IF;

  IF p_actor_type = 'USER' AND p_actor_id_usuario IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ACTOR_USER_REQUIRED';
  END IF;

  START TRANSACTION;

  SELECT state
    INTO v_from_state
    FROM ale_evento
   WHERE id_evento = p_id_evento
     AND id_tenant = p_id_tenant
   FOR UPDATE;

  IF v_not_found = 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'EVENT_NOT_FOUND';
  END IF;

  IF NOT (
    (v_from_state = 'NEW' AND p_to_state = 'IN_REVIEW')
    OR (v_from_state = 'NEW' AND p_to_state = 'ESCALATING')
    OR (v_from_state = 'IN_REVIEW' AND p_to_state = 'ESCALATING')
    OR (v_from_state = 'IN_REVIEW' AND p_to_state = 'CLOSED')
    OR (v_from_state = 'ESCALATING' AND p_to_state = 'CLOSED')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'INVALID_EVENT_STATE_TRANSITION';
  END IF;

  UPDATE ale_evento
     SET state = p_to_state,
         decision_reason = p_decision,
         actualizado_en = CURRENT_TIMESTAMP(3)
   WHERE id_evento = p_id_evento
     AND id_tenant = p_id_tenant;

  INSERT INTO log_evento_timeline (
    id_evento_timeline,
    id_tenant,
    id_evento,
    action_type,
    from_state,
    to_state,
    decision,
    comment_text,
    actor_type,
    actor_id_usuario,
    occurred_at,
    request_id
  ) VALUES (
    p_id_evento_timeline,
    p_id_tenant,
    p_id_evento,
    'STATE_CHANGE',
    v_from_state,
    p_to_state,
    p_decision,
    p_comment_text,
    p_actor_type,
    p_actor_id_usuario,
    CURRENT_TIMESTAMP(3),
    p_request_id
  );

  COMMIT;
END$$

DELIMITER ;
