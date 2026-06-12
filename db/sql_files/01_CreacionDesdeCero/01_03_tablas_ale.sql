CREATE TABLE IF NOT EXISTS ale_regla (
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
  actualizado_en          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_regla_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_regla_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_regla_created_by_gen_usuario_id_usuario
    FOREIGN KEY (created_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT fk_ale_regla_updated_by_gen_usuario_id_usuario
    FOREIGN KEY (updated_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_regla_tenant_enabled_priority
    (id_tenant, enabled, priority_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ale_evento (
  id_evento              CHAR(26)     PRIMARY KEY,
  id_tenant              CHAR(26)     NOT NULL,
  id_site                CHAR(26)     NOT NULL,
  id_fuente              CHAR(26)     NOT NULL,
  external_event_id      VARCHAR(128) NULL,
  event_type             VARCHAR(64)  NOT NULL,
  severity               TINYINT      NOT NULL,
  zone_code              VARCHAR(64)  NULL,
  plate                  VARCHAR(16)  NULL,
  occurred_at            DATETIME(3)  NOT NULL,
  ingested_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  state                  ENUM('NEW','IN_REVIEW','ESCALATING','CLOSED') NOT NULL DEFAULT 'NEW',
  critical               TINYINT(1)   NOT NULL DEFAULT 0,
  priority               INT          NOT NULL DEFAULT 0,
  payload_version        VARCHAR(16)  NOT NULL DEFAULT '1.0',
  raw_payload_json       JSON         NOT NULL,
  matched_rule_ids_json  JSON         NULL,
  decision_reason        VARCHAR(255) NULL,
  request_id             VARCHAR(64)  NULL,
  creado_en              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                         ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_evento_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_evento_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_evento_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_cola
    (id_tenant, state, priority DESC, occurred_at DESC),
  INDEX idx_evento_filtros
    (id_tenant, id_site, zone_code, event_type, severity, occurred_at DESC),
  INDEX idx_evento_plate (id_tenant, plate, occurred_at DESC),
  INDEX idx_evento_request (request_id),
  CONSTRAINT chk_evento_severity CHECK (severity BETWEEN 1 AND 5),
  CONSTRAINT chk_evento_priority CHECK (priority BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ale_evidencia (
  id_evidencia  CHAR(26)      PRIMARY KEY,
  id_tenant     CHAR(26)      NOT NULL,
  id_evento     CHAR(26)      NOT NULL,
  kind          ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER') NOT NULL,
  storage_uri   VARCHAR(1024) NOT NULL,
  mime_type     VARCHAR(128)  NULL,
  sha256        CHAR(64)      NULL,
  captured_at   DATETIME(3)   NULL,
  creado_en     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_evidencia_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_evidencia_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_evidencia_evento (id_evento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ale_notificacion (
  id_notificacion    CHAR(26)      PRIMARY KEY,
  id_tenant          CHAR(26)      NOT NULL,
  id_site            CHAR(26)      NOT NULL,
  id_evento          CHAR(26)      NULL,
  id_caso_velocidad  CHAR(26)      NULL,
  channel            ENUM('IN_APP','WS','EMAIL_INTERNAL','PUSH') NOT NULL,
  target_type        ENUM('USER','ROLE','GROUP') NOT NULL,
  target_value       VARCHAR(160)  NOT NULL,
  message_body       TEXT          NOT NULL,
  status             ENUM('QUEUED','SENT','FAILED') NOT NULL DEFAULT 'QUEUED',
  attempts           INT           NOT NULL DEFAULT 0,
  last_attempt_at    DATETIME(3)   NULL,
  sent_at            DATETIME(3)   NULL,
  error_code         VARCHAR(64)   NULL,
  error_message      VARCHAR(255)  NULL,
  creado_en          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ale_notif_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_ale_notif_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_ale_notif_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_notificacion_tenant_status
    (id_tenant, status, creado_en DESC),
  CONSTRAINT chk_notificacion_attempts CHECK (attempts >= 0),
  CONSTRAINT chk_notificacion_origen CHECK (
    (id_evento IS NOT NULL AND id_caso_velocidad IS NULL)
    OR (id_evento IS NULL AND id_caso_velocidad IS NOT NULL)
  )
) ENGINE=InnoDB;

-- D9: suscripciones Web Push (VAPID) por usuario. El envío se registra en
-- ale_notificacion con channel='PUSH'.
CREATE TABLE IF NOT EXISTS ale_push_suscripcion (
  id_push_suscripcion  CHAR(26)     PRIMARY KEY,
  id_tenant            CHAR(26)     NOT NULL,
  id_usuario           CHAR(26)     NOT NULL,
  endpoint             VARCHAR(512) NOT NULL,
  p256dh               VARCHAR(255) NOT NULL,
  auth_secret          VARCHAR(255) NOT NULL,
  user_agent           VARCHAR(255) NULL,
  activo               TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                     ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_push_susc_tenant FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_push_susc_usuario FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT uk_push_susc_endpoint UNIQUE (endpoint(255)),
  INDEX idx_push_susc_usuario (id_usuario, activo)
) ENGINE=InnoDB;
