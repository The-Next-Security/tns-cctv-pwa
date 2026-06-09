CREATE TABLE IF NOT EXISTS log_evento_timeline (
  id_evento_timeline  CHAR(26)     PRIMARY KEY,
  id_tenant           CHAR(26)     NOT NULL,
  id_evento           CHAR(26)     NOT NULL,
  action_type         VARCHAR(64)  NOT NULL,
  from_state          ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  to_state            ENUM('NEW','IN_REVIEW','CLOSED') NULL,
  decision            VARCHAR(128) NULL,
  comment_text        TEXT         NULL,
  actor_type          ENUM('USER','SYSTEM','CONNECTOR') NOT NULL,
  actor_id_usuario    CHAR(26)     NULL,
  metadata_json       JSON         NULL,
  occurred_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  request_id          VARCHAR(64)  NULL,
  CONSTRAINT fk_log_timeline_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_log_timeline_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  CONSTRAINT fk_log_timeline_actor_gen_usuario_id_usuario
    FOREIGN KEY (actor_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_evento_timeline_evento_time (id_evento, occurred_at ASC),
  INDEX idx_evento_timeline_tenant_time (id_tenant, occurred_at DESC),
  CONSTRAINT chk_timeline_actor CHECK (
    actor_type <> 'USER' OR actor_id_usuario IS NOT NULL
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log_auditoria_api (
  id_auditoria_api  CHAR(26)     PRIMARY KEY,
  id_tenant         CHAR(26)     NULL,
  id_site           CHAR(26)     NULL,
  id_usuario        CHAR(26)     NULL,
  actor_role        VARCHAR(32)  NULL,
  action            VARCHAR(128) NOT NULL,
  resource_type     VARCHAR(64)  NOT NULL,
  resource_id       CHAR(26)     NULL,
  request_id        VARCHAR(64)  NOT NULL,
  status_code       SMALLINT     NOT NULL,
  details_json      JSON         NULL,
  creado_en         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_log_audit_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_log_audit_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_log_audit_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_auditoria_api_request (request_id),
  INDEX idx_auditoria_api_tenant_time (id_tenant, creado_en DESC),
  CONSTRAINT chk_auditoria_status_code CHECK (status_code BETWEEN 100 AND 599)
) ENGINE=InnoDB;
