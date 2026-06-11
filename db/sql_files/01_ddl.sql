SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Canonical MySQL 8 data model (core entities only)

CREATE TABLE tenants (
  id CHAR(26) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE sites (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sites_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT uq_sites_tenant_code UNIQUE (tenant_id, code)
) ENGINE=InnoDB;

CREATE TABLE users (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  email VARCHAR(190) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role ENUM('GUARD','ADMIN','OPS','SUPERADMIN_TNS') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
) ENGINE=InnoDB;

CREATE TABLE user_site_access (
  user_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, site_id),
  CONSTRAINT fk_usa_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_usa_site FOREIGN KEY (site_id) REFERENCES sites(id)
) ENGINE=InnoDB;

CREATE TABLE auth_sessions (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  issued_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_auth_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uq_refresh_hash UNIQUE (refresh_token_hash)
) ENGINE=InnoDB;

CREATE TABLE sources (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_code VARCHAR(64) NOT NULL,
  source_type ENUM('NVR','CAMERA','ANPR','SPEED_SENSOR','EDGE_CONNECTOR') NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  metadata_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sources_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_sources_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT uq_sources_tenant_code UNIQUE (tenant_id, source_code)
) ENGINE=InnoDB;

CREATE TABLE ingress_idempotency (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  endpoint_key VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  resource_type ENUM('EVENT','SPEED_EVENT') NOT NULL,
  resource_id CHAR(26) NOT NULL,
  first_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_idemp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT uq_idemp_scope UNIQUE (tenant_id, endpoint_key, idempotency_key)
) ENGINE=InnoDB;

CREATE TABLE rules (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NULL,
  name VARCHAR(160) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  priority_order INT NOT NULL DEFAULT 100,
  conditions_json JSON NOT NULL,
  actions_json JSON NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  created_by_user_id CHAR(26) NOT NULL,
  updated_by_user_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_rules_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_rules_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_rules_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE events (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  external_event_id VARCHAR(128) NULL,
  event_type VARCHAR(64) NOT NULL,
  severity TINYINT NOT NULL,
  zone_code VARCHAR(64) NULL,
  plate VARCHAR(16) NULL,
  occurred_at DATETIME(3) NOT NULL,
  ingested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  state ENUM('NEW','IN_REVIEW','CLOSED') NOT NULL DEFAULT 'NEW',
  critical TINYINT(1) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  payload_version VARCHAR(16) NOT NULL DEFAULT '1.0',
  raw_payload_json JSON NOT NULL,
  matched_rule_ids_json JSON NULL,
  decision_reason VARCHAR(255) NULL,
  request_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_events_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_events_source FOREIGN KEY (source_id) REFERENCES sources(id)
) ENGINE=InnoDB;

CREATE TABLE event_evidence (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  event_id CHAR(26) NOT NULL,
  kind ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER') NOT NULL,
  storage_uri VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(128) NULL,
  sha256 CHAR(64) NULL,
  captured_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_event_evidence_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_event_evidence_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB;

CREATE TABLE event_timeline (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  event_id CHAR(26) NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  from_state ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  to_state ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  decision VARCHAR(128) NULL,
  comment_text TEXT NULL,
  actor_type ENUM('USER','SYSTEM','CONNECTOR') NOT NULL,
  actor_user_id CHAR(26) NULL,
  metadata_json JSON NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_id VARCHAR(64) NULL,
  CONSTRAINT fk_event_timeline_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_event_timeline_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_event_timeline_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE admissions (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  plate VARCHAR(16) NULL,
  visitor_id VARCHAR(64) NULL,
  visitor_name VARCHAR(160) NULL,
  destination_company VARCHAR(160) NOT NULL,
  source_type ENUM('MANUAL','ANPR','HYBRID') NOT NULL,
  entry_at DATETIME(3) NOT NULL,
  notes TEXT NULL,
  review_required TINYINT(1) NOT NULL DEFAULT 0,
  created_by_user_id CHAR(26) NOT NULL,
  updated_by_user_id CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_adm_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_adm_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_adm_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE speed_events (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  external_event_id VARCHAR(128) NULL,
  plate VARCHAR(16) NULL,
  speed_kph DECIMAL(6,2) NOT NULL,
  speed_limit_kph DECIMAL(6,2) NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  payload_version VARCHAR(16) NOT NULL DEFAULT '1.0',
  raw_payload_json JSON NOT NULL,
  request_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_spd_evt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_evt_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_spd_evt_source FOREIGN KEY (source_id) REFERENCES sources(id)
) ENGINE=InnoDB;

CREATE TABLE speed_event_evidence (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  speed_event_id CHAR(26) NOT NULL,
  kind ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER') NOT NULL,
  storage_uri VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(128) NULL,
  sha256 CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_spd_ev_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_ev_event FOREIGN KEY (speed_event_id) REFERENCES speed_events(id)
) ENGINE=InnoDB;

CREATE TABLE speed_cases (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  speed_event_id CHAR(26) NOT NULL,
  state ENUM('OPEN','CORRELATED_AUTO','CORRELATED_MANUAL','CLOSED') NOT NULL DEFAULT 'OPEN',
  correlation_status ENUM('PENDING','MATCHED','AMBIGUOUS','UNMATCHED','MANUAL_MATCHED') NOT NULL DEFAULT 'PENDING',
  correlation_confidence DECIMAL(5,4) NULL,
  correlated_admission_id CHAR(26) NULL,
  correlated_by ENUM('AUTO','MANUAL') NULL,
  opened_at DATETIME(3) NOT NULL,
  closed_at DATETIME(3) NULL,
  notes VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_spd_case_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_case_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_spd_case_event FOREIGN KEY (speed_event_id) REFERENCES speed_events(id),
  CONSTRAINT fk_spd_case_adm FOREIGN KEY (correlated_admission_id) REFERENCES admissions(id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  channel ENUM('IN_APP','EMAIL_INTERNAL','WEBHOOK') NOT NULL,
  recipient VARCHAR(180) NOT NULL,
  event_id CHAR(26) NULL,
  speed_case_id CHAR(26) NULL,
  status ENUM('QUEUED','SENT','FAILED','CANCELLED') NOT NULL DEFAULT 'QUEUED',
  provider_message_id VARCHAR(120) NULL,
  attempts INT NOT NULL DEFAULT 1,
  last_error VARCHAR(500) NULL,
  sent_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_notif_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_notif_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_notif_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_notif_case FOREIGN KEY (speed_case_id) REFERENCES speed_cases(id)
) ENGINE=InnoDB;

CREATE TABLE edge_connectors (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  connector_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status ENUM('ACTIVE','INACTIVE','DEGRADED','OFFLINE') NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at DATETIME(3) NULL,
  version VARCHAR(40) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_connector_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_connector_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT uq_connector UNIQUE (tenant_id, site_id, connector_key)
) ENGINE=InnoDB;

CREATE TABLE device_health_status (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_type ENUM('CAMERA','NVR','CONNECTOR') NOT NULL,
  source_ref_id CHAR(26) NOT NULL,
  status ENUM('HEALTHY','DEGRADED','OFFLINE') NOT NULL,
  consecutive_failures INT NOT NULL DEFAULT 0,
  last_check_at DATETIME(3) NOT NULL,
  last_ok_at DATETIME(3) NULL,
  detail_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_source_health UNIQUE (tenant_id, site_id, source_type, source_ref_id)
) ENGINE=InnoDB;

CREATE TABLE health_incidents (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  incident_key VARCHAR(64) NOT NULL,
  source_type ENUM('CAMERA','NVR','CONNECTOR') NOT NULL,
  source_ref_id CHAR(26) NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  status ENUM('OPEN','ACK','RESOLVED') NOT NULL DEFAULT 'OPEN',
  opened_at DATETIME(3) NOT NULL,
  resolved_at DATETIME(3) NULL,
  detail_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_health_incident UNIQUE (tenant_id, incident_key)
) ENGINE=InnoDB;
