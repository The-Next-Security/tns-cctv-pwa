# DATA-MODEL.md

<!-- ARC_TASK:t_57457627 -->

## 1. Objetivo

Esquema MySQL 8 para soportar M1..M14 con multi-tenant estricto, auditoría y correlación velocidad↔admissions + integración Dahua HTTP API v3.26.

**Estándar:** `The-Next-Security/estandares-generales` — sistema de prefijos obligatorio.

> **Nota:** Los archivos en `db/sql_files/` (estructura legacy) serán migrados a `db/SQL_FILES/` con la estructura estándar en una rama dedicada posterior. Este documento refleja el modelo de datos objetivo.

## 2. Sistema de Prefijos

| Prefijo | Módulo |
|---------|--------|
| `gen_` | General — tenants, sites, usuarios, sesiones, configuración |
| `log_` | Auditoría — timeline, audit log |
| `ale_` | Alertas — eventos, reglas, evidencia, notificaciones |
| `src_` | Fuentes/Dispositivos — cámaras, conectores, idempotencia |
| `sal_` | Salud — estado fuentes, incidentes, chequeos |
| `adm_` | Admisiones — ingresos, speed events, correlación |
| `dah_` | Dahua — integración HTTP API v3.26 |

**PKs:** `id_{tabla_sin_prefijo} CHAR(26)` (ULID). Ver ADR en `DATABASE-SPEC.md`.

## 3. DDL completo (MySQL 8)

```sql
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- gen_ — GENERAL
-- ============================================================

CREATE TABLE gen_tenant (
  id_tenant      CHAR(26)     PRIMARY KEY,
  code           VARCHAR(64)  NOT NULL UNIQUE,
  name           VARCHAR(160) NOT NULL,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  creado_en      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE gen_site (
  id_site        CHAR(26)     PRIMARY KEY,
  id_tenant      CHAR(26)     NOT NULL,
  code           VARCHAR(64)  NOT NULL,
  name           VARCHAR(160) NOT NULL,
  timezone       VARCHAR(64)  NOT NULL DEFAULT 'America/Santiago',
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  creado_en      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_site_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_site_tenant_code UNIQUE (id_tenant, code),
  INDEX idx_site_tenant_status (id_tenant, status)
) ENGINE=InnoDB;

CREATE TABLE gen_usuario (
  id_usuario     CHAR(26)     PRIMARY KEY,
  id_tenant      CHAR(26)     NOT NULL,
  email          VARCHAR(190) NOT NULL,
  full_name      VARCHAR(160) NOT NULL,
  role           ENUM('GUARD','ADMIN','OPS','SUPERADMIN_TNS') NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  status         ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  creado_en      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_usuario_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_usuario_tenant_email UNIQUE (id_tenant, email),
  INDEX idx_usuario_tenant_role_status (id_tenant, role, status)
) ENGINE=InnoDB;

CREATE TABLE gen_acceso_sitio (
  id_usuario  CHAR(26)    NOT NULL,
  id_site     CHAR(26)    NOT NULL,
  granted_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id_usuario, id_site),
  CONSTRAINT fk_gen_acceso_sitio_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT fk_gen_acceso_sitio_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site)
) ENGINE=InnoDB;

CREATE TABLE gen_sesion (
  id_sesion          CHAR(26)     PRIMARY KEY,
  id_tenant          CHAR(26)     NOT NULL,
  id_usuario         CHAR(26)     NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  issued_at          DATETIME(3)  NOT NULL,
  expires_at         DATETIME(3)  NOT NULL,
  revoked_at         DATETIME(3)  NULL,
  creado_en          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_sesion_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_gen_sesion_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  UNIQUE KEY uk_sesion_refresh_hash (refresh_token_hash),
  INDEX idx_sesion_usuario_expires (id_usuario, expires_at)
) ENGINE=InnoDB;

CREATE TABLE gen_configuracion_grupos (
  id_configuracion_grupos INT          PRIMARY KEY AUTO_INCREMENT,
  nombre                  VARCHAR(50)  NOT NULL UNIQUE,
  descripcion             TEXT         NULL,
  orden                   INT          NOT NULL DEFAULT 0,
  activo                  TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE gen_configuracion_parametros (
  id_configuracion_parametros INT          PRIMARY KEY AUTO_INCREMENT,
  id_configuracion_grupos     INT          NOT NULL,
  ruta_completa               VARCHAR(255) NOT NULL UNIQUE,
  nombre_parametro            VARCHAR(100) NOT NULL,
  es_sensible                 TINYINT(1)   NOT NULL DEFAULT 0,
  es_requerido                TINYINT(1)   NOT NULL DEFAULT 0,
  valor_default               TEXT         NULL,
  activo                      TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_gen_conf_param_id_conf_grupos_gen_conf_grupos_id_conf_grupos
    FOREIGN KEY (id_configuracion_grupos)
    REFERENCES gen_configuracion_grupos(id_configuracion_grupos),
  INDEX idx_configuracion_parametros_ruta (ruta_completa),
  INDEX idx_configuracion_parametros_id_grupos-activo (id_configuracion_grupos, activo)
) ENGINE=InnoDB;

CREATE TABLE gen_configuracion_valores (
  id_configuracion_valores    INT        PRIMARY KEY AUTO_INCREMENT,
  id_configuracion_parametros INT        NOT NULL,
  valor                       TEXT       NOT NULL,
  version                     INT        NOT NULL DEFAULT 1,
  activo                      TINYINT(1) NOT NULL DEFAULT 1,
  valido_desde                DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valido_hasta                DATETIME   NULL,
  CONSTRAINT fk_gen_conf_valores_id_conf_param_gen_conf_param_id_conf_param
    FOREIGN KEY (id_configuracion_parametros)
    REFERENCES gen_configuracion_parametros(id_configuracion_parametros),
  CONSTRAINT uk_configuracion_valores_parametro_activo
    UNIQUE (id_configuracion_parametros, activo),
  INDEX idx_configuracion_valores_id_param-activo (id_configuracion_parametros, activo)
) ENGINE=InnoDB;

-- ============================================================
-- src_ — FUENTES Y DISPOSITIVOS
-- ============================================================

CREATE TABLE src_fuente (
  id_fuente      CHAR(26)     PRIMARY KEY,
  id_tenant      CHAR(26)     NOT NULL,
  id_site        CHAR(26)     NOT NULL,
  source_code    VARCHAR(64)  NOT NULL,
  source_type    ENUM('NVR','CAMERA','ANPR','SPEED_SENSOR','EDGE_CONNECTOR') NOT NULL,
  display_name   VARCHAR(160) NOT NULL,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  metadata_json  JSON         NULL,
  creado_en      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_src_fuente_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_src_fuente_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT uk_fuente_tenant_code UNIQUE (id_tenant, source_code),
  INDEX idx_fuente_site_type_status (id_site, source_type, status)
) ENGINE=InnoDB;

CREATE TABLE src_conector_edge (
  id_conector_edge  CHAR(26)    PRIMARY KEY,
  id_tenant         CHAR(26)    NOT NULL,
  id_site           CHAR(26)    NOT NULL,
  code              VARCHAR(64) NOT NULL,
  version           VARCHAR(32) NULL,
  status            ENUM('ACTIVE','INACTIVE','DEGRADED','OFFLINE') NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at DATETIME(3) NULL,
  metadata_json     JSON        NULL,
  creado_en         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_src_conector_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_src_conector_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  INDEX idx_conector_edge_tenant_status (id_tenant, status, last_heartbeat_at DESC)
) ENGINE=InnoDB;

CREATE TABLE src_idempotencia_ingesta (
  id_idempotencia_ingesta CHAR(26)     PRIMARY KEY,
  id_tenant               CHAR(26)     NOT NULL,
  endpoint_key            VARCHAR(64)  NOT NULL,
  idempotency_key         VARCHAR(128) NOT NULL,
  payload_hash            CHAR(64)     NOT NULL,
  resource_type           ENUM('EVENTO','EVENTO_VELOCIDAD') NOT NULL,
  resource_id             CHAR(26)     NOT NULL,
  first_seen_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at              DATETIME(3)  NOT NULL,
  CONSTRAINT fk_src_idemp_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_idempotencia_scope UNIQUE (id_tenant, endpoint_key, idempotency_key),
  INDEX idx_idempotencia_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================================
-- ale_ — ALERTAS Y REGLAS
-- ============================================================

CREATE TABLE ale_regla (
  id_regla                CHAR(26)     PRIMARY KEY,
  id_tenant               CHAR(26)     NOT NULL,
  id_site                 CHAR(26)     NULL,
  name                    VARCHAR(160) NOT NULL,
  enabled                 TINYINT(1)   NOT NULL DEFAULT 1,
  priority_order          INT          NOT NULL DEFAULT 100,
  conditions_json         JSON         NOT NULL,
  actions_json            JSON         NOT NULL,
  timezone                VARCHAR(64)  NOT NULL DEFAULT 'America/Santiago',
  created_by_id_usuario   CHAR(26)     NOT NULL,
  updated_by_id_usuario   CHAR(26)     NOT NULL,
  creado_en               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_regla_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_regla_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_regla_created_by_gen_usuario_id_usuario
    FOREIGN KEY (created_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT fk_ale_regla_updated_by_gen_usuario_id_usuario
    FOREIGN KEY (updated_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_regla_tenant_enabled_priority (id_tenant, enabled, priority_order)
) ENGINE=InnoDB;

CREATE TABLE ale_evento (
  id_evento             CHAR(26)     PRIMARY KEY,
  id_tenant             CHAR(26)     NOT NULL,
  id_site               CHAR(26)     NOT NULL,
  id_fuente             CHAR(26)     NOT NULL,
  external_event_id     VARCHAR(128) NULL,
  event_type            VARCHAR(64)  NOT NULL,
  severity              TINYINT      NOT NULL,
  zone_code             VARCHAR(64)  NULL,
  plate                 VARCHAR(16)  NULL,
  occurred_at           DATETIME(3)  NOT NULL,
  ingested_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  state                 ENUM('NEW','IN_REVIEW','CLOSED') NOT NULL DEFAULT 'NEW',
  critical              TINYINT(1)   NOT NULL DEFAULT 0,
  priority              INT          NOT NULL DEFAULT 0,
  payload_version       VARCHAR(16)  NOT NULL DEFAULT '1.0',
  raw_payload_json      JSON         NOT NULL,
  matched_rule_ids_json JSON         NULL,
  decision_reason       VARCHAR(255) NULL,
  request_id            VARCHAR(64)  NULL,
  creado_en             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_evento_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_evento_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_evento_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_cola (id_tenant, state, priority DESC, occurred_at DESC),
  INDEX idx_evento_filtros (id_tenant, id_site, zone_code, event_type, severity, occurred_at DESC),
  INDEX idx_evento_plate (id_tenant, plate, occurred_at DESC),
  INDEX idx_evento_request (request_id)
) ENGINE=InnoDB;

CREATE TABLE ale_evidencia (
  id_evidencia CHAR(26)      PRIMARY KEY,
  id_tenant    CHAR(26)      NOT NULL,
  id_evento    CHAR(26)      NOT NULL,
  kind         ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER') NOT NULL,
  storage_uri  VARCHAR(1024) NOT NULL,
  mime_type    VARCHAR(128)  NULL,
  sha256       CHAR(64)      NULL,
  captured_at  DATETIME(3)   NULL,
  creado_en    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_evidencia_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_evidencia_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_evidencia_evento (id_evento)
) ENGINE=InnoDB;

CREATE TABLE ale_notificacion (
  id_notificacion   CHAR(26)      PRIMARY KEY,
  id_tenant         CHAR(26)      NOT NULL,
  id_site           CHAR(26)      NOT NULL,
  id_evento         CHAR(26)      NULL,
  id_caso_velocidad CHAR(26)      NULL,
  channel           ENUM('IN_APP','WS','EMAIL_INTERNAL') NOT NULL,
  target_type       ENUM('USER','ROLE','GROUP') NOT NULL,
  target_value      VARCHAR(160)  NOT NULL,
  message_body      TEXT          NOT NULL,
  status            ENUM('QUEUED','SENT','FAILED') NOT NULL DEFAULT 'QUEUED',
  attempts          INT           NOT NULL DEFAULT 0,
  last_attempt_at   DATETIME(3)   NULL,
  sent_at           DATETIME(3)   NULL,
  error_code        VARCHAR(64)   NULL,
  error_message     VARCHAR(255)  NULL,
  creado_en         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_notif_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_notif_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_notif_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_notificacion_tenant_status (id_tenant, status, creado_en DESC)
) ENGINE=InnoDB;

-- ============================================================
-- log_ — AUDITORÍA
-- ============================================================

CREATE TABLE log_evento_timeline (
  id_evento_timeline CHAR(26)     PRIMARY KEY,
  id_tenant          CHAR(26)     NOT NULL,
  id_evento          CHAR(26)     NOT NULL,
  action_type        VARCHAR(64)  NOT NULL,
  from_state         ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  to_state           ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  decision           VARCHAR(128) NULL,
  comment_text       TEXT         NULL,
  actor_type         ENUM('USER','SYSTEM','CONNECTOR') NOT NULL,
  actor_id_usuario   CHAR(26)     NULL,
  metadata_json      JSON         NULL,
  occurred_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_id         VARCHAR(64)  NULL,
  CONSTRAINT fk_log_timeline_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_log_timeline_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  CONSTRAINT fk_log_timeline_actor_gen_usuario_id_usuario
    FOREIGN KEY (actor_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_evento_timeline_evento_time (id_evento, occurred_at ASC),
  INDEX idx_evento_timeline_tenant_time (id_tenant, occurred_at DESC)
) ENGINE=InnoDB;

CREATE TABLE log_auditoria_api (
  id_auditoria_api CHAR(26)     PRIMARY KEY,
  id_tenant        CHAR(26)     NULL,
  id_site          CHAR(26)     NULL,
  id_usuario       CHAR(26)     NULL,
  actor_role       VARCHAR(32)  NULL,
  action           VARCHAR(128) NOT NULL,
  resource_type    VARCHAR(64)  NOT NULL,
  resource_id      CHAR(26)     NULL,
  request_id       VARCHAR(64)  NOT NULL,
  status_code      SMALLINT     NOT NULL,
  details_json     JSON         NULL,
  creado_en        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_log_audit_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_log_audit_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_log_audit_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_auditoria_api_request (request_id),
  INDEX idx_auditoria_api_tenant_time (id_tenant, creado_en DESC)
) ENGINE=InnoDB;

-- ============================================================
-- sal_ — SALUD DEL SISTEMA
-- ============================================================

CREATE TABLE sal_estado_fuente (
  id_estado_fuente     CHAR(26)    PRIMARY KEY,
  id_tenant            CHAR(26)    NOT NULL,
  id_site              CHAR(26)    NOT NULL,
  id_fuente            CHAR(26)    NOT NULL,
  status               ENUM('UP','DEGRADED','DOWN') NOT NULL,
  last_seen_at         DATETIME(3) NULL,
  consecutive_failures INT         NOT NULL DEFAULT 0,
  metrics_json         JSON        NULL,
  actualizado_en       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_estado_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_estado_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_sal_estado_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT uk_estado_fuente_tenant_fuente UNIQUE (id_tenant, id_fuente),
  INDEX idx_estado_fuente_tenant_status (id_tenant, status, actualizado_en DESC)
) ENGINE=InnoDB;

CREATE TABLE sal_incidente (
  id_incidente    CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  id_site         CHAR(26)     NOT NULL,
  id_fuente       CHAR(26)     NOT NULL,
  status          ENUM('OPEN','ACKED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  opened_at       DATETIME(3)  NOT NULL,
  acknowledged_at DATETIME(3)  NULL,
  resolved_at     DATETIME(3)  NULL,
  title           VARCHAR(180) NOT NULL,
  details         TEXT         NULL,
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_incidente_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_incidente_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_sal_incidente_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_incidente_tenant_status_opened (id_tenant, status, opened_at DESC)
) ENGINE=InnoDB;

CREATE TABLE sal_chequeo (
  id_chequeo                CHAR(26)    PRIMARY KEY,
  id_tenant                 CHAR(26)    NOT NULL,
  triggered_by_id_usuario   CHAR(26)    NULL,
  trigger_type              ENUM('SCHEDULER','MANUAL_OPS') NOT NULL,
  status                    ENUM('SCHEDULED','RUNNING','DONE','FAILED') NOT NULL,
  started_at                DATETIME(3) NULL,
  finished_at               DATETIME(3) NULL,
  summary_json              JSON        NULL,
  request_id                VARCHAR(64) NULL,
  creado_en                 DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_chequeo_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_chequeo_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (triggered_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_chequeo_tenant_status (id_tenant, status, creado_en DESC)
) ENGINE=InnoDB;

-- ============================================================
-- adm_ — ADMISIONES Y VELOCIDAD
-- ============================================================

CREATE TABLE adm_ingreso (
  id_ingreso              CHAR(26)     PRIMARY KEY,
  id_tenant               CHAR(26)     NOT NULL,
  id_site                 CHAR(26)     NOT NULL,
  plate                   VARCHAR(16)  NULL,
  visitor_id              VARCHAR(64)  NULL,
  visitor_name            VARCHAR(160) NULL,
  destination_company     VARCHAR(160) NOT NULL,
  source_type             ENUM('MANUAL','ANPR','HYBRID') NOT NULL,
  entry_at                DATETIME(3)  NOT NULL,
  notes                   TEXT         NULL,
  review_required         TINYINT(1)   NOT NULL DEFAULT 0,
  created_by_id_usuario   CHAR(26)     NOT NULL,
  updated_by_id_usuario   CHAR(26)     NULL,
  creado_en               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_ingreso_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_ingreso_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_adm_ingreso_created_by_gen_usuario_id_usuario
    FOREIGN KEY (created_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT fk_adm_ingreso_updated_by_gen_usuario_id_usuario
    FOREIGN KEY (updated_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_ingreso_tenant_entry (id_tenant, entry_at DESC),
  INDEX idx_ingreso_tenant_plate (id_tenant, plate, entry_at DESC),
  INDEX idx_ingreso_review (id_tenant, review_required, entry_at DESC)
) ENGINE=InnoDB;

CREATE TABLE adm_evento_velocidad (
  id_evento_velocidad CHAR(26)       PRIMARY KEY,
  id_tenant           CHAR(26)       NOT NULL,
  id_site             CHAR(26)       NOT NULL,
  id_fuente           CHAR(26)       NOT NULL,
  external_event_id   VARCHAR(128)   NULL,
  plate               VARCHAR(16)    NULL,
  speed_kph           DECIMAL(6,2)   NOT NULL,
  speed_limit_kph     DECIMAL(6,2)   NOT NULL,
  occurred_at         DATETIME(3)    NOT NULL,
  payload_version     VARCHAR(16)    NOT NULL DEFAULT '1.0',
  raw_payload_json    JSON           NOT NULL,
  request_id          VARCHAR(64)    NULL,
  creado_en           DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_evt_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_evt_vel_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_adm_evt_vel_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_velocidad_tenant_time (id_tenant, occurred_at DESC),
  INDEX idx_evento_velocidad_plate (id_tenant, plate, occurred_at DESC)
) ENGINE=InnoDB;

CREATE TABLE adm_evidencia_velocidad (
  id_evidencia_velocidad CHAR(26)      PRIMARY KEY,
  id_tenant              CHAR(26)      NOT NULL,
  id_evento_velocidad    CHAR(26)      NOT NULL,
  kind                   ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER') NOT NULL,
  storage_uri            VARCHAR(1024) NOT NULL,
  mime_type              VARCHAR(128)  NULL,
  sha256                 CHAR(64)      NULL,
  creado_en              DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_ev_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_ev_vel_id_evt_vel_adm_evt_vel_id_evt_vel
    FOREIGN KEY (id_evento_velocidad) REFERENCES adm_evento_velocidad(id_evento_velocidad),
  INDEX idx_evidencia_velocidad_evento (id_evento_velocidad)
) ENGINE=InnoDB;

CREATE TABLE adm_caso_velocidad (
  id_caso_velocidad        CHAR(26)       PRIMARY KEY,
  id_tenant                CHAR(26)       NOT NULL,
  id_site                  CHAR(26)       NOT NULL,
  id_evento_velocidad      CHAR(26)       NOT NULL,
  state                    ENUM('OPEN','CORRELATED_AUTO','CORRELATED_MANUAL','CLOSED') NOT NULL DEFAULT 'OPEN',
  correlation_status       ENUM('PENDING','CORRELATED_AUTO','CORRELATED_MANUAL','MANUAL_REVIEW_REQUIRED','NO_MATCH') NOT NULL DEFAULT 'PENDING',
  confidence_score         DECIMAL(5,4)   NULL,
  correlation_window_minutes INT          NOT NULL DEFAULT 120,
  matched_id_ingreso       CHAR(26)       NULL,
  manual_review_required   TINYINT(1)     NOT NULL DEFAULT 0,
  correlation_reason       VARCHAR(255)   NULL,
  creado_en                DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en           DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_caso_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_caso_vel_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_adm_caso_vel_id_evt_vel_adm_evt_vel_id_evt_vel
    FOREIGN KEY (id_evento_velocidad) REFERENCES adm_evento_velocidad(id_evento_velocidad),
  CONSTRAINT fk_adm_caso_vel_id_ingreso_adm_ingreso_id_ingreso
    FOREIGN KEY (matched_id_ingreso) REFERENCES adm_ingreso(id_ingreso),
  INDEX idx_caso_velocidad_tenant_state (id_tenant, state, creado_en DESC),
  INDEX idx_caso_velocidad_correlation (id_tenant, correlation_status, creado_en DESC)
) ENGINE=InnoDB;

CREATE TABLE adm_candidato_correlacion (
  id_candidato_correlacion CHAR(26)      PRIMARY KEY,
  id_tenant                CHAR(26)      NOT NULL,
  id_caso_velocidad        CHAR(26)      NOT NULL,
  id_ingreso               CHAR(26)      NOT NULL,
  score                    DECIMAL(5,4)  NOT NULL,
  reason                   VARCHAR(255)  NULL,
  selected                 TINYINT(1)    NOT NULL DEFAULT 0,
  creado_en                DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_cand_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_cand_id_caso_adm_caso_vel_id_caso_vel
    FOREIGN KEY (id_caso_velocidad) REFERENCES adm_caso_velocidad(id_caso_velocidad),
  CONSTRAINT fk_adm_cand_id_ingreso_adm_ingreso_id_ingreso
    FOREIGN KEY (id_ingreso) REFERENCES adm_ingreso(id_ingreso),
  CONSTRAINT uk_candidato_caso_ingreso UNIQUE (id_caso_velocidad, id_ingreso),
  INDEX idx_candidato_correlacion_caso_score (id_caso_velocidad, score DESC)
) ENGINE=InnoDB;

-- ============================================================
-- dah_ — INTEGRACIÓN DAHUA HTTP API v3.26
-- ============================================================

CREATE TABLE dah_evento_crudo (
  id_evento_crudo CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  id_fuente       CHAR(26)     NOT NULL,
  channel         INT          NOT NULL,
  event_code      VARCHAR(64)  NOT NULL,
  action          ENUM('Start','Stop','Pulse') NOT NULL,
  received_at     DATETIME(3)  NOT NULL,
  payload_json    JSON         NOT NULL,
  processed       TINYINT(1)   NOT NULL DEFAULT 0,
  id_evento       CHAR(26)     NULL,
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_crudo_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_crudo_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT fk_dah_evt_crudo_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_evento_crudo_tenant_time (id_tenant, received_at DESC),
  INDEX idx_evento_crudo_code_time (id_fuente, event_code, received_at DESC),
  INDEX idx_evento_crudo_pending (processed, received_at ASC)
) ENGINE=InnoDB;

CREATE TABLE dah_deteccion_facial (
  id_deteccion_facial CHAR(26)    PRIMARY KEY,
  id_tenant           CHAR(26)    NOT NULL,
  id_evento_crudo     CHAR(26)    NOT NULL,
  id_fuente           CHAR(26)    NOT NULL,
  channel             INT         NOT NULL,
  detected_at         DATETIME(3) NOT NULL,
  sex                 ENUM('Man','Woman','Unknown') NOT NULL DEFAULT 'Unknown',
  age                 TINYINT UNSIGNED NULL,
  has_glasses         TINYINT(1)  NULL,
  has_mask            TINYINT(1)  NULL,
  has_beard           TINYINT(1)  NULL,
  snapshot_path       VARCHAR(512) NULL,
  creado_en           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_det_facial_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_det_facial_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_det_facial_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_deteccion_facial_tenant_time (id_tenant, detected_at DESC),
  INDEX idx_deteccion_facial_fuente_time (id_fuente, detected_at DESC)
) ENGINE=InnoDB;

CREATE TABLE dah_reconocimiento_facial (
  id_reconocimiento_facial CHAR(26)    PRIMARY KEY,
  id_tenant                CHAR(26)    NOT NULL,
  id_deteccion_facial      CHAR(26)    NOT NULL,
  rec_result               TINYINT(1)  NOT NULL,
  similarity               TINYINT UNSIGNED NULL,
  person_name              VARCHAR(128) NULL,
  person_id                VARCHAR(64)  NULL,
  person_group_id          VARCHAR(64)  NULL,
  certificate_type         ENUM('IC','Passport','Unknown') NULL,
  scene_image_path         VARCHAR(512) NULL,
  creado_en                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_rec_facial_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_rec_facial_id_det_facial_dah_det_facial_id_det_facial
    FOREIGN KEY (id_deteccion_facial) REFERENCES dah_deteccion_facial(id_deteccion_facial),
  INDEX idx_reconocimiento_facial_person (id_tenant, person_id),
  INDEX idx_reconocimiento_facial_deteccion (id_deteccion_facial)
) ENGINE=InnoDB;

CREATE TABLE dah_deteccion_vehiculo (
  id_deteccion_vehiculo CHAR(26)    PRIMARY KEY,
  id_tenant             CHAR(26)    NOT NULL,
  id_evento_crudo       CHAR(26)    NOT NULL,
  id_fuente             CHAR(26)    NOT NULL,
  channel               INT         NOT NULL,
  detected_at           DATETIME(3) NOT NULL,
  plate_number          VARCHAR(16)  NULL,
  plate_type            VARCHAR(32)  NULL,
  plate_color           VARCHAR(32)  NULL,
  vehicle_color         VARCHAR(32)  NULL,
  country_code          CHAR(2)      NULL,
  speed_kmh             SMALLINT UNSIGNED NULL,
  traffic_event         VARCHAR(64)  NULL,
  snapshot_path         VARCHAR(512) NULL,
  creado_en             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_det_veh_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_det_veh_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_det_veh_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_deteccion_vehiculo_plate (id_tenant, plate_number, detected_at DESC),
  INDEX idx_deteccion_vehiculo_fuente (id_fuente, detected_at DESC)
) ENGINE=InnoDB;

CREATE TABLE dah_evento_ivs (
  id_evento_ivs   CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  id_evento_crudo CHAR(26)     NOT NULL,
  id_fuente       CHAR(26)     NOT NULL,
  channel         INT          NOT NULL,
  triggered_at    DATETIME(3)  NOT NULL,
  rule_name       VARCHAR(128) NULL,
  rule_type       VARCHAR(64)  NOT NULL,
  action          VARCHAR(32)  NOT NULL,
  object_type     VARCHAR(32)  NULL,
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_ivs_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_ivs_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_evt_ivs_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_ivs_tenant_time (id_tenant, triggered_at DESC),
  INDEX idx_evento_ivs_rule_type (id_fuente, rule_type, triggered_at DESC)
) ENGINE=InnoDB;

CREATE TABLE dah_evento_audio (
  id_evento_audio   CHAR(26)    PRIMARY KEY,
  id_tenant         CHAR(26)    NOT NULL,
  id_evento_crudo   CHAR(26)    NOT NULL,
  id_fuente         CHAR(26)    NOT NULL,
  channel           INT         NOT NULL,
  detected_at       DATETIME(3) NOT NULL,
  sound_type        VARCHAR(64) NOT NULL,
  intensity_threshold TINYINT UNSIGNED NULL,
  creado_en         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_audio_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_audio_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_evt_audio_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_audio_tenant_time (id_tenant, detected_at DESC),
  INDEX idx_evento_audio_type (id_fuente, sound_type, detected_at DESC)
) ENGINE=InnoDB;

CREATE TABLE dah_archivo_grabacion (
  id_archivo_grabacion CHAR(26)      PRIMARY KEY,
  id_tenant            CHAR(26)      NOT NULL,
  id_fuente            CHAR(26)      NOT NULL,
  channel              INT           NOT NULL,
  start_time           DATETIME      NOT NULL,
  end_time             DATETIME      NOT NULL,
  file_type            ENUM('dav','mp4','jpg') NOT NULL,
  video_stream         ENUM('Main','Extra1','Extra2','Extra3') NOT NULL DEFAULT 'Main',
  file_path            VARCHAR(512)  NOT NULL,
  duration_seconds     SMALLINT UNSIGNED NULL,
  file_size_bytes      INT UNSIGNED  NULL,
  events_json          JSON          NULL,
  fetched_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_arch_gra_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_arch_gra_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT uk_archivo_grabacion_fuente_path UNIQUE (id_fuente, file_path),
  INDEX idx_archivo_grabacion_tenant_time (id_tenant, start_time DESC),
  INDEX idx_archivo_grabacion_fuente_time (id_fuente, start_time DESC)
) ENGINE=InnoDB;

CREATE TABLE dah_snapshot (
  id_snapshot     CHAR(26)      PRIMARY KEY,
  id_tenant       CHAR(26)      NOT NULL,
  id_fuente       CHAR(26)      NOT NULL,
  id_evento       CHAR(26)      NULL,
  channel         INT           NOT NULL,
  captured_at     DATETIME(3)   NOT NULL,
  trigger         ENUM('ON_DEMAND','EVENT','SCHEDULED') NOT NULL,
  storage_uri     VARCHAR(1024) NOT NULL,
  mime_type       VARCHAR(64)   NULL,
  sha256          CHAR(64)      NULL,
  width_px        SMALLINT UNSIGNED NULL,
  height_px       SMALLINT UNSIGNED NULL,
  file_size_bytes INT UNSIGNED  NULL,
  creado_en       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_snapshot_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_snapshot_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT fk_dah_snapshot_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_snapshot_tenant_time (id_tenant, captured_at DESC),
  INDEX idx_snapshot_fuente_time (id_fuente, captured_at DESC),
  INDEX idx_snapshot_evento (id_evento)
) ENGINE=InnoDB;

CREATE TABLE dah_suscripcion (
  id_suscripcion    CHAR(26)     PRIMARY KEY,
  id_tenant         CHAR(26)     NOT NULL,
  id_fuente         CHAR(26)     NOT NULL,
  channel           INT          NULL,
  event_codes_json  JSON         NOT NULL,
  status            ENUM('ACTIVE','INACTIVE','ERROR') NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at DATETIME(3)  NULL,
  error_message     VARCHAR(255) NULL,
  creado_en         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_suscripcion_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_suscripcion_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_suscripcion_tenant_status (id_tenant, status, actualizado_en DESC)
) ENGINE=InnoDB;
```

## 4. Relaciones clave

- `gen_tenant` 1:N con casi todas las entidades de dominio (aislamiento multi-tenant estricto).
- `ale_evento` 1:N `ale_evidencia` y 1:N `log_evento_timeline`.
- `adm_evento_velocidad` 1:1 `adm_caso_velocidad` (MVP).
- `adm_caso_velocidad` N:1 `adm_ingreso` seleccionado + N:N candidatos via `adm_candidato_correlacion`.
- `src_fuente` 1:1 estado salud + 1:N incidentes.
- `dah_evento_crudo` → `dah_deteccion_facial`/`dah_deteccion_vehiculo`/`dah_evento_ivs`/`dah_evento_audio`.
- `dah_deteccion_facial` 1:N `dah_reconocimiento_facial`.
- `dah_deteccion_vehiculo.plate_number` ↔ `adm_ingreso.plate` — correlación ANPR.

## 5. Índices críticos por caso de uso

- Cola operativa: `idx_evento_cola`
- Filtros evento: `idx_evento_filtros`
- Búsqueda patente (alertas): `idx_evento_plate`
- Búsqueda patente (ANPR): `idx_deteccion_vehiculo_plate`
- Búsqueda patente (admisiones): `idx_ingreso_tenant_plate`
- Timeline: `idx_evento_timeline_evento_time`
- Cola procesamiento pendiente Dahua: `idx_evento_crudo_pending`
- Salud: `idx_estado_fuente_tenant_status`, `idx_incidente_tenant_status_opened`

## 6. Reglas de integridad

1. Toda consulta debe filtrar por `id_tenant`. Sin excepción.
2. Idempotency key repetida con payload_hash distinto → `IDEMPOTENCY_CONFLICT`.
3. Transiciones de estado se validan antes de persistir.
4. Correlación manual exige `correlation_reason` + registro en `log_evento_timeline`.
5. Parámetros `gen_configuracion_parametros.es_sensible = 1` nunca se incluyen en logs.

---
*Última actualización: 2026-06-08*
