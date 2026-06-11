DELIMITER $$

CREATE PROCEDURE sp_register_event_state_change(
  IN p_event_id CHAR(26),
  IN p_actor_user_id CHAR(26),
  IN p_to_state VARCHAR(20),
  IN p_decision VARCHAR(128),
  IN p_comment TEXT,
  IN p_request_id VARCHAR(64)
)
BEGIN
  INSERT INTO event_timeline (
    id, tenant_id, event_id, action_type, from_state, to_state,
    decision, comment_text, actor_type, actor_user_id, request_id
  )
  SELECT
    CONCAT('tl_', LEFT(REPLACE(UUID(), '-', ''), 24)),
    e.tenant_id,
    e.id,
    'STATE_CHANGE',
    e.state,
    p_to_state,
    p_decision,
    p_comment,
    'USER',
    p_actor_user_id,
    p_request_id
  FROM events e
  WHERE e.id = p_event_id;
END$$

DELIMITER ;
