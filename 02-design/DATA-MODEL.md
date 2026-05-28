# Data Model — MySQL 8 (MVP CCTV)

Motor: MySQL 8.0+
Charset/collation: utf8mb4 / utf8mb4_unicode_ci
Zona horaria de persistencia: UTC (convertir a America/Santiago en presentación)

## 1) Diagrama lógico (resumen)

- tenant -> site -> zone -> camera
- nvr_device pertenece a site
- security_event referencia camera/zone/rule opcional
- event_evidence cuelga de security_event
- admission_record representa ingreso ANPR/manual/híbrido
- speed_case referencia speed_event + correlación a admission_record
- notification_log referencia event o speed_case
- device_health_status + health_incident para M8
- event_state_history + audit_log para trazabilidad

## 2) DDL completo

```sql
CREATE DATABASE IF NOT EXISTS tns_cctv_mvp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cctv_mvp;

CREATE TABLE tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_key VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (status IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE sites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_site (tenant_id, site_key),
  KEY idx_sites_tenant (tenant_id),
  CONSTRAINT fk_sites_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CHECK (status IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE zones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  zone_code VARCHAR(64) NOT NULL,
  zone_name VARCHAR(120) NOT NULL,
  criticality VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_zone (tenant_id, site_id, zone_code),
  KEY idx_zones_site (site_id),
  CONSTRAINT fk_zones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_zones_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CHECK (criticality IN ('LOW','MEDIUM','HIGH','CRITICAL'))
) ENGINE=InnoDB;

CREATE TABLE nvr_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  nvr_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  vendor VARCHAR(40) NOT NULL DEFAULT 'DAHUA',
  model VARCHAR(80) NULL,
  firmware_version VARCHAR(80) NULL,
  ip_local VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_nvr (tenant_id, site_id, nvr_key),
  KEY idx_nvr_site (site_id),
  KEY idx_nvr_last_seen (last_seen_at),
  CONSTRAINT fk_nvr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_nvr_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CHECK (status IN ('ACTIVE','INACTIVE','DEGRADED','OFFLINE'))
) ENGINE=InnoDB;

CREATE TABLE cameras (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  zone_id BIGINT UNSIGNED NULL,
  nvr_id BIGINT UNSIGNED NULL,
  camera_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  stream_rtsp_url VARCHAR(512) NULL,
  role_type VARCHAR(30) NOT NULL DEFAULT 'SECURITY',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_camera (tenant_id, site_id, camera_key),
  KEY idx_camera_site_zone (site_id, zone_id),
  KEY idx_camera_nvr (nvr_id),
  KEY idx_camera_last_seen (last_seen_at),
  CONSTRAINT fk_camera_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_camera_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_camera_zone FOREIGN KEY (zone_id) REFERENCES zones(id),
  CONSTRAINT fk_camera_nvr FOREIGN KEY (nvr_id) REFERENCES nvr_devices(id),
  CHECK (role_type IN ('SECURITY','ANPR','SPEED')),
  CHECK (status IN ('ACTIVE','INACTIVE','DEGRADED','OFFLINE'))
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  user_key VARCHAR(64) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  role VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (tenant_id, user_key),
  UNIQUE KEY uk_user_email (tenant_id, email),
  KEY idx_users_tenant_role (tenant_id, role),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CHECK (role IN ('GUARD','ADMIN','OPS','SUPERADMIN_TNS')),
  CHECK (status IN ('ACTIVE','INACTIVE','LOCKED'))
) ENGINE=InnoDB;

CREATE TABLE event_rules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  rule_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  priority INT NOT NULL DEFAULT 50,
  severity_threshold VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  schedule_tz VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  schedule_from TIME NULL,
  schedule_to TIME NULL,
  actions_json JSON NOT NULL,
  conditions_json JSON NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_rule (tenant_id, site_id, rule_key),
  KEY idx_rule_tenant_site_enabled (tenant_id, site_id, enabled),
  KEY idx_rule_priority (priority),
  CONSTRAINT fk_rule_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_rule_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_rule_user FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (severity_threshold IN ('LOW','MEDIUM','HIGH','CRITICAL'))
) ENGINE=InnoDB;

CREATE TABLE security_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  event_key VARCHAR(64) NOT NULL,
  external_event_id VARCHAR(128) NULL,
  camera_id BIGINT UNSIGNED NULL,
  zone_id BIGINT UNSIGNED NULL,
  rule_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  is_critical TINYINT(1) NOT NULL DEFAULT 0,
  state VARCHAR(20) NOT NULL DEFAULT 'NEW',
  occurred_at DATETIME NOT NULL,
  received_at DATETIME NOT NULL,
  acknowledged_at DATETIME NULL,
  closed_at DATETIME NULL,
  dedup_fingerprint VARCHAR(128) NULL,
  raw_payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_event_key (tenant_id, event_key),
  KEY idx_event_occurred (tenant_id, site_id, occurred_at),
  KEY idx_event_filters (tenant_id, state, event_type, severity, is_critical),
  KEY idx_event_plate_hint (external_event_id),
  KEY idx_event_dedup (tenant_id, dedup_fingerprint),
  CONSTRAINT fk_event_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_event_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_event_camera FOREIGN KEY (camera_id) REFERENCES cameras(id),
  CONSTRAINT fk_event_zone FOREIGN KEY (zone_id) REFERENCES zones(id),
  CONSTRAINT fk_event_rule FOREIGN KEY (rule_id) REFERENCES event_rules(id),
  CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CHECK (state IN ('NEW','IN_REVIEW','CLOSED'))
) ENGINE=InnoDB;

CREATE TABLE event_evidences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  evidence_type VARCHAR(20) NOT NULL,
  object_url VARCHAR(1024) NOT NULL,
  checksum_sha256 CHAR(64) NULL,
  captured_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_evidence_event (event_id),
  KEY idx_evidence_type (tenant_id, evidence_type),
  CONSTRAINT fk_evidence_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_evidence_event FOREIGN KEY (event_id) REFERENCES security_events(id),
  CHECK (evidence_type IN ('SNAPSHOT','CLIP','THUMBNAIL'))
) ENGINE=InnoDB;

CREATE TABLE event_state_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  from_state VARCHAR(20) NULL,
  to_state VARCHAR(20) NOT NULL,
  decision_code VARCHAR(50) NULL,
  comment_text VARCHAR(500) NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_state_event_time (event_id, changed_at),
  KEY idx_state_tenant_to (tenant_id, to_state),
  CONSTRAINT fk_state_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_state_event FOREIGN KEY (event_id) REFERENCES security_events(id),
  CONSTRAINT fk_state_user FOREIGN KEY (changed_by) REFERENCES users(id),
  CHECK (to_state IN ('NEW','IN_REVIEW','CLOSED'))
) ENGINE=InnoDB;

CREATE TABLE admission_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  admission_key VARCHAR(64) NOT NULL,
  plate VARCHAR(16) NULL,
  plate_normalized VARCHAR(16) NULL,
  anpr_confidence DECIMAL(5,4) NULL,
  source_type VARCHAR(20) NOT NULL,
  review_required TINYINT(1) NOT NULL DEFAULT 0,
  visitor_identifier VARCHAR(80) NULL,
  visitor_name VARCHAR(120) NULL,
  destination_company VARCHAR(160) NULL,
  entry_at DATETIME NOT NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_admission_key (tenant_id, admission_key),
  KEY idx_admission_plate_time (tenant_id, plate_normalized, entry_at),
  KEY idx_admission_filters (tenant_id, site_id, entry_at, review_required),
  CONSTRAINT fk_adm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_adm_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_adm_user FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (source_type IN ('ANPR','MANUAL','HYBRID'))
) ENGINE=InnoDB;

CREATE TABLE speed_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  speed_event_key VARCHAR(64) NOT NULL,
  camera_id BIGINT UNSIGNED NULL,
  plate VARCHAR(16) NOT NULL,
  plate_normalized VARCHAR(16) NOT NULL,
  speed_kmh DECIMAL(6,2) NOT NULL,
  speed_limit_kmh DECIMAL(6,2) NOT NULL,
  occurred_at DATETIME NOT NULL,
  evidence_url VARCHAR(1024) NULL,
  raw_payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_speed_event (tenant_id, speed_event_key),
  KEY idx_speed_plate_time (tenant_id, plate_normalized, occurred_at),
  KEY idx_speed_site_time (tenant_id, site_id, occurred_at),
  CONSTRAINT fk_speed_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_speed_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_speed_camera FOREIGN KEY (camera_id) REFERENCES cameras(id)
) ENGINE=InnoDB;

CREATE TABLE speed_cases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  case_key VARCHAR(64) NOT NULL,
  speed_event_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  correlation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  correlation_confidence DECIMAL(5,4) NULL,
  correlated_admission_id BIGINT UNSIGNED NULL,
  correlated_by VARCHAR(20) NULL,
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_speed_case (tenant_id, case_key),
  KEY idx_speed_case_filters (tenant_id, site_id, status, correlation_status, opened_at),
  KEY idx_speed_case_plate_time (tenant_id, opened_at),
  CONSTRAINT fk_spd_case_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_case_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_spd_case_event FOREIGN KEY (speed_event_id) REFERENCES speed_events(id),
  CONSTRAINT fk_spd_case_adm FOREIGN KEY (correlated_admission_id) REFERENCES admission_records(id),
  CHECK (status IN ('OPEN','IN_REVIEW','CLOSED')),
  CHECK (correlation_status IN ('PENDING','MATCHED','AMBIGUOUS','UNMATCHED','MANUAL_MATCHED')),
  CHECK (correlated_by IN ('AUTO','MANUAL') OR correlated_by IS NULL)
) ENGINE=InnoDB;

CREATE TABLE notification_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(180) NOT NULL,
  event_id BIGINT UNSIGNED NULL,
  speed_case_id BIGINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL,
  provider_message_id VARCHAR(120) NULL,
  attempts INT NOT NULL DEFAULT 1,
  last_error VARCHAR(500) NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_filters (tenant_id, site_id, channel, status, created_at),
  KEY idx_notif_event (event_id),
  KEY idx_notif_case (speed_case_id),
  CONSTRAINT fk_notif_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_notif_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_notif_event FOREIGN KEY (event_id) REFERENCES security_events(id),
  CONSTRAINT fk_notif_case FOREIGN KEY (speed_case_id) REFERENCES speed_cases(id),
  CHECK (channel IN ('IN_APP','EMAIL_INTERNAL','WEBHOOK')),
  CHECK (status IN ('QUEUED','SENT','FAILED','CANCELLED'))
) ENGINE=InnoDB;

CREATE TABLE edge_connectors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  connector_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at DATETIME NULL,
  version VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_connector (tenant_id, site_id, connector_key),
  KEY idx_connector_last_heartbeat (tenant_id, site_id, last_heartbeat_at),
  CONSTRAINT fk_connector_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_connector_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CHECK (status IN ('ACTIVE','INACTIVE','DEGRADED','OFFLINE'))
) ENGINE=InnoDB;

CREATE TABLE device_health_status (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  source_ref_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL,
  consecutive_failures INT NOT NULL DEFAULT 0,
  last_check_at DATETIME NOT NULL,
  last_ok_at DATETIME NULL,
  detail_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_source_health (tenant_id, site_id, source_type, source_ref_id),
  KEY idx_health_status (tenant_id, site_id, status, last_check_at),
  CHECK (source_type IN ('CAMERA','NVR','CONNECTOR')),
  CHECK (status IN ('HEALTHY','DEGRADED','OFFLINE'))
) ENGINE=InnoDB;

CREATE TABLE health_incidents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  incident_key VARCHAR(64) NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  source_ref_id BIGINT UNSIGNED NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  opened_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  detail_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_health_incident (tenant_id, incident_key),
  KEY idx_health_incident_filters (tenant_id, site_id, status, severity, opened_at),
  CHECK (source_type IN ('CAMERA','NVR','CONNECTOR')),
  CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CHECK (status IN ('OPEN','ACK','RESOLVED'))
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_type VARCHAR(20) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  request_id VARCHAR(80) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_tenant_time (tenant_id, created_at),
  KEY idx_audit_entity (tenant_id, entity_type, entity_id),
  KEY idx_audit_actor (tenant_id, actor_user_id, created_at),
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CHECK (actor_type IN ('USER','SYSTEM','CONNECTOR'))
) ENGINE=InnoDB;
```

## 3) Índices críticos por caso de uso

M1/M5 cola e historial:
- security_events idx_event_occurred
- security_events idx_event_filters
- event_state_history idx_state_event_time

M4/M6 correlación patente↔ingreso:
- admission_records idx_admission_plate_time
- speed_events idx_speed_plate_time
- speed_cases idx_speed_case_filters

M8 salud técnica:
- device_health_status idx_health_status
- health_incidents idx_health_incident_filters

## 4) Reglas de integridad

- Todo registro funcional lleva tenant_id y site_id (aislamiento).
- Cambios de estado de evento siempre generan fila en event_state_history.
- Expediente de velocidad nunca se crea sin speed_event_id.
- Correlación automática no pisa una correlación manual (requiere transición explícita).

## 5) Política de retención sugerida (MVP)

- audit_logs: 12 meses (mínimo).
- security_events + event_state_history: 12 meses.
- evidencias pesadas (objetos): lifecycle 90 días (configurable).
- health_incidents: 12 meses para análisis de disponibilidad.
