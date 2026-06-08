# DATA-MODEL.md

<!-- ARC_TASK:t_57457627 -->

## 1. Objetivo
Esquema MySQL 8 para soportar M1..M14 con multi-tenant estricto, auditoría y correlación velocidad↔admissions.

## 2. DDL completo (MySQL 8)
```sql
SET NAMES utf8mb4;
SET time_zone = '+00:00';

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
  CONSTRAINT uq_sites_tenant_code UNIQUE (tenant_id, code),
  INDEX idx_sites_tenant_status (tenant_id, status)
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
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
  INDEX idx_users_tenant_role_status (tenant_id, role, status)
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
  UNIQUE KEY uq_refresh_hash (refresh_token_hash),
  INDEX idx_auth_user_expires (user_id, expires_at)
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
  CONSTRAINT uq_sources_tenant_code UNIQUE (tenant_id, source_code),
  INDEX idx_sources_site_type (site_id, source_type, status)
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
  CONSTRAINT uq_idemp_scope UNIQUE (tenant_id, endpoint_key, idempotency_key),
  INDEX idx_idemp_expires (expires_at)
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
  CONSTRAINT fk_rules_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  INDEX idx_rules_tenant_enabled (tenant_id, enabled, priority_order)
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
  CONSTRAINT fk_events_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_events_tenant_state_priority (tenant_id, state, priority DESC, occurred_at DESC),
  INDEX idx_events_tenant_filters (tenant_id, site_id, zone_code, event_type, severity, occurred_at DESC),
  INDEX idx_events_plate_time (tenant_id, plate, occurred_at DESC),
  INDEX idx_events_request (request_id)
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
  CONSTRAINT fk_event_evidence_event FOREIGN KEY (event_id) REFERENCES events(id),
  INDEX idx_event_evidence_event (event_id)
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
  CONSTRAINT fk_event_timeline_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_event_timeline_event_time (event_id, occurred_at ASC),
  INDEX idx_event_timeline_tenant_time (tenant_id, occurred_at DESC)
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
  CONSTRAINT fk_adm_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  INDEX idx_adm_tenant_entry (tenant_id, entry_at DESC),
  INDEX idx_adm_tenant_plate_entry (tenant_id, plate, entry_at DESC),
  INDEX idx_adm_review (tenant_id, review_required, entry_at DESC)
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
  CONSTRAINT fk_spd_evt_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_spd_evt_tenant_time (tenant_id, occurred_at DESC),
  INDEX idx_spd_evt_tenant_plate (tenant_id, plate, occurred_at DESC)
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
  CONSTRAINT fk_spd_ev_event FOREIGN KEY (speed_event_id) REFERENCES speed_events(id),
  INDEX idx_spd_ev_event (speed_event_id)
) ENGINE=InnoDB;

CREATE TABLE speed_cases (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  speed_event_id CHAR(26) NOT NULL,
  state ENUM('OPEN','CORRELATED_AUTO','CORRELATED_MANUAL','CLOSED') NOT NULL DEFAULT 'OPEN',
  correlation_status ENUM('PENDING','CORRELATED_AUTO','CORRELATED_MANUAL','MANUAL_REVIEW_REQUIRED','NO_MATCH') NOT NULL DEFAULT 'PENDING',
  confidence_score DECIMAL(5,4) NULL,
  correlation_window_minutes INT NOT NULL DEFAULT 120,
  matched_admission_id CHAR(26) NULL,
  manual_review_required TINYINT(1) NOT NULL DEFAULT 0,
  correlation_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_spd_case_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_case_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_spd_case_event FOREIGN KEY (speed_event_id) REFERENCES speed_events(id),
  CONSTRAINT fk_spd_case_adm FOREIGN KEY (matched_admission_id) REFERENCES admissions(id),
  INDEX idx_spd_case_tenant_state (tenant_id, state, created_at DESC),
  INDEX idx_spd_case_tenant_corr (tenant_id, correlation_status, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE speed_case_correlation_candidates (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  speed_case_id CHAR(26) NOT NULL,
  admission_id CHAR(26) NOT NULL,
  score DECIMAL(5,4) NOT NULL,
  reason VARCHAR(255) NULL,
  selected TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_spd_cand_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_spd_cand_case FOREIGN KEY (speed_case_id) REFERENCES speed_cases(id),
  CONSTRAINT fk_spd_cand_adm FOREIGN KEY (admission_id) REFERENCES admissions(id),
  CONSTRAINT uq_case_adm UNIQUE (speed_case_id, admission_id),
  INDEX idx_spd_cand_case_score (speed_case_id, score DESC)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  event_id CHAR(26) NULL,
  speed_case_id CHAR(26) NULL,
  channel ENUM('IN_APP','WS','EMAIL_INTERNAL') NOT NULL,
  target_type ENUM('USER','ROLE','GROUP') NOT NULL,
  target_value VARCHAR(160) NOT NULL,
  message_body TEXT NOT NULL,
  status ENUM('QUEUED','SENT','FAILED') NOT NULL DEFAULT 'QUEUED',
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at DATETIME(3) NULL,
  sent_at DATETIME(3) NULL,
  error_code VARCHAR(64) NULL,
  error_message VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_not_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_not_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_not_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_not_case FOREIGN KEY (speed_case_id) REFERENCES speed_cases(id),
  INDEX idx_not_tenant_status (tenant_id, status, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE health_sources_status (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  status ENUM('UP','DEGRADED','DOWN') NOT NULL,
  last_seen_at DATETIME(3) NULL,
  consecutive_failures INT NOT NULL DEFAULT 0,
  metrics_json JSON NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hss_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_hss_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_hss_source FOREIGN KEY (source_id) REFERENCES sources(id),
  CONSTRAINT uq_hss_source UNIQUE (tenant_id, source_id),
  INDEX idx_hss_tenant_status (tenant_id, status, updated_at DESC)
) ENGINE=InnoDB;

CREATE TABLE health_incidents (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  site_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  status ENUM('OPEN','ACKED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  opened_at DATETIME(3) NOT NULL,
  acknowledged_at DATETIME(3) NULL,
  resolved_at DATETIME(3) NULL,
  title VARCHAR(180) NOT NULL,
  details TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_hi_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_hi_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_hi_tenant_status_opened (tenant_id, status, opened_at DESC)
) ENGINE=InnoDB;

CREATE TABLE health_check_runs (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  triggered_by_user_id CHAR(26) NULL,
  trigger_type ENUM('SCHEDULER','MANUAL_OPS') NOT NULL,
  status ENUM('SCHEDULED','RUNNING','DONE','FAILED') NOT NULL,
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  summary_json JSON NULL,
  request_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hcr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_hcr_user FOREIGN KEY (triggered_by_user_id) REFERENCES users(id),
  INDEX idx_hcr_tenant_status (tenant_id, status, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE api_audit_log (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NULL,
  site_id CHAR(26) NULL,
  actor_user_id CHAR(26) NULL,
  actor_role VARCHAR(32) NULL,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id CHAR(26) NULL,
  request_id VARCHAR(64) NOT NULL,
  status_code SMALLINT NOT NULL,
  details_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_audit_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_audit_request (request_id),
  INDEX idx_audit_tenant_time (tenant_id, created_at DESC)
) ENGINE=InnoDB;
```

## 3. Relaciones clave
- `tenant` 1:N con casi todas las entidades de dominio.
- `events` 1:N `event_evidence` y 1:N `event_timeline`.
- `speed_events` 1:1 `speed_cases` (MVP).
- `speed_cases` N:1 `admissions` seleccionado + N:N candidatos.
- `sources` 1:1 estado salud + 1:N incidentes.

## 4. Índices críticos por caso de uso
- Cola operativa: `idx_events_tenant_state_priority`.
- Filtros evento: `idx_events_tenant_filters`.
- Búsqueda patente: `idx_events_plate_time`, `idx_adm_tenant_plate_entry`, `idx_spd_evt_tenant_plate`.
- Timeline: `idx_event_timeline_event_time`.
- Salud: `idx_hss_tenant_status`, `idx_hi_tenant_status_opened`.

## 5. Reglas de integridad
1. Toda consulta debe filtrar por `tenant_id`.
2. Idempotency key repetida con hash distinto => `IDEMPOTENCY_CONFLICT`.
3. Transiciones de estado se validan contra estado actual.
4. Correlación manual exige justificación y auditoría.

## 6. Tablas de integración Dahua HTTP API v3.26

Estas tablas almacenan los datos originados en los NVRs/cámaras Dahua. Todas dependen de `sources` para mantener el aislamiento multi-tenant.

```sql
-- Evento crudo recibido del stream SSE Dahua antes de procesamiento
CREATE TABLE dahua_event_raw (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,           -- FK a sources (NVR o CAMERA)
  channel INT NOT NULL,
  event_code VARCHAR(64) NOT NULL,       -- VideoMotion, FaceDetection, TrafficJunction, etc.
  action ENUM('Start','Stop','Pulse') NOT NULL,
  received_at DATETIME(3) NOT NULL,
  payload_json JSON NOT NULL,            -- payload completo para auditoría y reprocess
  processed TINYINT(1) NOT NULL DEFAULT 0,
  linked_event_id CHAR(26) NULL,         -- FK a events una vez procesado
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dhr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_dhr_source FOREIGN KEY (source_id) REFERENCES sources(id),
  CONSTRAINT fk_dhr_event FOREIGN KEY (linked_event_id) REFERENCES events(id),
  INDEX idx_dhr_tenant_time (tenant_id, received_at DESC),
  INDEX idx_dhr_source_code (source_id, event_code, received_at DESC),
  INDEX idx_dhr_processed (processed, received_at ASC)
) ENGINE=InnoDB;

-- Detección facial (sin requerir reconocimiento exitoso)
CREATE TABLE face_detection_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  dahua_event_raw_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  channel INT NOT NULL,
  detected_at DATETIME(3) NOT NULL,
  sex ENUM('Man','Woman','Unknown') NOT NULL DEFAULT 'Unknown',
  age TINYINT UNSIGNED NULL,
  has_glasses TINYINT(1) NULL,           -- NULL = no detectado
  has_mask TINYINT(1) NULL,
  has_beard TINYINT(1) NULL,
  snapshot_path VARCHAR(512) NULL,       -- ruta en object storage
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_fdr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_fdr_raw FOREIGN KEY (dahua_event_raw_id) REFERENCES dahua_event_raw(id),
  CONSTRAINT fk_fdr_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_fdr_tenant_time (tenant_id, detected_at DESC),
  INDEX idx_fdr_source_time (source_id, detected_at DESC)
) ENGINE=InnoDB;

-- Reconocimiento facial (match contra base de datos del NVR)
CREATE TABLE face_recognition_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  detection_id CHAR(26) NOT NULL,        -- FK a face_detection_records
  rec_result TINYINT(1) NOT NULL,        -- 0=failed, 1=success
  similarity TINYINT UNSIGNED NULL,      -- 0-100
  person_name VARCHAR(128) NULL,
  person_id VARCHAR(64) NULL,            -- ID en base de datos del NVR
  person_group_id VARCHAR(64) NULL,
  certificate_type ENUM('IC','Passport','Unknown') NULL,
  scene_image_path VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_frr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_frr_detection FOREIGN KEY (detection_id) REFERENCES face_detection_records(id),
  INDEX idx_frr_tenant_person (tenant_id, person_id),
  INDEX idx_frr_detection (detection_id)
) ENGINE=InnoDB;

-- Detección vehicular y ANPR (TrafficJunction, TrafficOverSpeed, etc.)
CREATE TABLE vehicle_detection_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  dahua_event_raw_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  channel INT NOT NULL,
  detected_at DATETIME(3) NOT NULL,
  plate_number VARCHAR(16) NULL,         -- patente leída por ANPR
  plate_type VARCHAR(32) NULL,           -- Yellow, Blue, etc.
  plate_color VARCHAR(32) NULL,
  vehicle_color VARCHAR(32) NULL,        -- White, Black, Silver, etc.
  country_code CHAR(2) NULL,             -- ISO 3166-1 alpha-2
  speed_kmh SMALLINT UNSIGNED NULL,      -- NULL si no aplica
  traffic_event VARCHAR(64) NULL,        -- TrafficJunction, TrafficOverSpeed, TrafficRetrograde, etc.
  snapshot_path VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_vdr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_vdr_raw FOREIGN KEY (dahua_event_raw_id) REFERENCES dahua_event_raw(id),
  CONSTRAINT fk_vdr_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_vdr_tenant_plate (tenant_id, plate_number, detected_at DESC),
  INDEX idx_vdr_source_time (source_id, detected_at DESC)
) ENGINE=InnoDB;

-- Eventos IVS: línea virtual, zona, merodeo, objeto abandonado, etc.
CREATE TABLE ivs_event_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  dahua_event_raw_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  channel INT NOT NULL,
  triggered_at DATETIME(3) NOT NULL,
  rule_name VARCHAR(128) NULL,           -- nombre de la regla configurada en el NVR
  rule_type VARCHAR(64) NOT NULL,        -- CrossLineDetection, CrossRegionDetection, WanderDetection, etc.
  action VARCHAR(32) NOT NULL,           -- Appear, Disappear, Inside, Cross
  object_type VARCHAR(32) NULL,          -- Human, Vehicle, NonMotor, Unknown
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ivs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_ivs_raw FOREIGN KEY (dahua_event_raw_id) REFERENCES dahua_event_raw(id),
  CONSTRAINT fk_ivs_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_ivs_tenant_time (tenant_id, triggered_at DESC),
  INDEX idx_ivs_source_type (source_id, rule_type, triggered_at DESC)
) ENGINE=InnoDB;

-- Eventos de análisis de audio (disparos, gritos, vidrio roto, etc.)
CREATE TABLE audio_event_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  dahua_event_raw_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  channel INT NOT NULL,
  detected_at DATETIME(3) NOT NULL,
  sound_type VARCHAR(64) NOT NULL,       -- AudioCry, AudioAlarm, AudioGunshot, AudioExplosion, AudioScream, AudioCrashingGlass
  intensity_threshold TINYINT UNSIGNED NULL,  -- 1-100
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_aer_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_aer_raw FOREIGN KEY (dahua_event_raw_id) REFERENCES dahua_event_raw(id),
  CONSTRAINT fk_aer_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_aer_tenant_time (tenant_id, detected_at DESC),
  INDEX idx_aer_source_type (source_id, sound_type, detected_at DESC)
) ENGINE=InnoDB;

-- Archivos de grabación indexados via mediaFileFind
CREATE TABLE recording_files (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,           -- FK a sources (NVR o CAMERA)
  channel INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  file_type ENUM('dav','mp4','jpg') NOT NULL,
  video_stream ENUM('Main','Extra1','Extra2','Extra3') NOT NULL DEFAULT 'Main',
  file_path VARCHAR(512) NOT NULL,       -- ruta en NVR
  duration_seconds SMALLINT UNSIGNED NULL,
  file_size_bytes INT UNSIGNED NULL,
  events_json JSON NULL,                 -- array de event_codes presentes en el clip
  fetched_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_rf_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_rf_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_rf_tenant_time (tenant_id, start_time DESC),
  INDEX idx_rf_source_time (source_id, start_time DESC),
  CONSTRAINT uq_rf_source_path UNIQUE (source_id, file_path)
) ENGINE=InnoDB;

-- Snapshots individuales (bajo demanda, por evento o programado)
CREATE TABLE snapshots (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,
  event_id CHAR(26) NULL,               -- FK a events si fue disparado por un evento
  channel INT NOT NULL,
  captured_at DATETIME(3) NOT NULL,
  trigger ENUM('ON_DEMAND','EVENT','SCHEDULED') NOT NULL,
  storage_uri VARCHAR(1024) NOT NULL,    -- URI en object storage
  mime_type VARCHAR(64) NULL,
  sha256 CHAR(64) NULL,
  width_px SMALLINT UNSIGNED NULL,
  height_px SMALLINT UNSIGNED NULL,
  file_size_bytes INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_snap_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_snap_source FOREIGN KEY (source_id) REFERENCES sources(id),
  CONSTRAINT fk_snap_event FOREIGN KEY (event_id) REFERENCES events(id),
  INDEX idx_snap_tenant_time (tenant_id, captured_at DESC),
  INDEX idx_snap_source_time (source_id, captured_at DESC),
  INDEX idx_snap_event (event_id)
) ENGINE=InnoDB;

-- Suscripciones SSE activas por NVR (para gestión del ciclo de vida del conector)
CREATE TABLE dahua_subscriptions (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL,
  source_id CHAR(26) NOT NULL,           -- FK a sources tipo NVR o EDGE_CONNECTOR
  channel INT NULL,                      -- NULL = todos los canales
  event_codes_json JSON NOT NULL,        -- array de event_codes suscritos
  status ENUM('ACTIVE','INACTIVE','ERROR') NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at DATETIME(3) NULL,
  error_message VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dsub_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_dsub_source FOREIGN KEY (source_id) REFERENCES sources(id),
  INDEX idx_dsub_tenant_status (tenant_id, status, updated_at DESC)
) ENGINE=InnoDB;
```

## 7. Índices adicionales para integración Dahua

- `vehicle_detection_records`: búsqueda por patente para correlación con `admissions`.
- `dahua_event_raw`: cola de procesamiento pendiente via `idx_dhr_processed`.
- `ivs_event_records`: análisis por tipo de regla y fuente.

## 8. Nota de correlación ANPR

`vehicle_detection_records.plate_number` puede cruzarse con `admissions.plate` para verificación de ingresos en tiempo real. El `Correlation Engine` (M9/S2) usa este cruce como fuente de verdad cuando `admissions.source_type = 'ANPR'`.

---
*Última actualización: 2026-06-08*