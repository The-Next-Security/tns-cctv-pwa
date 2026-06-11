-- API / operational log table extracted from the canonical model.

CREATE TABLE api_audit_log (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  actor_user_id CHAR(26) NULL,
  actor_type ENUM('USER','SYSTEM','CONNECTOR') NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  request_id VARCHAR(80) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  payload_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
