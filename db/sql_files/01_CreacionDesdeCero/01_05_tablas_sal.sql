CREATE TABLE IF NOT EXISTS sal_estado_fuente (
  id_estado_fuente      CHAR(26)    PRIMARY KEY,
  id_tenant             CHAR(26)    NOT NULL,
  id_site               CHAR(26)    NOT NULL,
  id_fuente             CHAR(26)    NOT NULL,
  status                ENUM('UP','DEGRADED','DOWN') NOT NULL,
  last_seen_at          DATETIME(3) NULL,
  consecutive_failures  INT         NOT NULL DEFAULT 0,
  metrics_json          JSON        NULL,
  actualizado_en        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_estado_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_estado_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_sal_estado_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT uk_estado_fuente_tenant_fuente UNIQUE (id_tenant, id_fuente),
  INDEX idx_estado_fuente_tenant_status
    (id_tenant, status, actualizado_en DESC),
  CONSTRAINT chk_estado_fuente_failures CHECK (consecutive_failures >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sal_incidente (
  id_incidente     CHAR(26)     PRIMARY KEY,
  id_tenant        CHAR(26)     NOT NULL,
  id_site          CHAR(26)     NOT NULL,
  id_fuente        CHAR(26)     NOT NULL,
  status           ENUM('OPEN','ACKED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  opened_at        DATETIME(3)  NOT NULL,
  acknowledged_at  DATETIME(3)  NULL,
  resolved_at      DATETIME(3)  NULL,
  title            VARCHAR(180) NOT NULL,
  details          TEXT         NULL,
  creado_en        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_incidente_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_incidente_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_sal_incidente_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_incidente_tenant_status_opened
    (id_tenant, status, opened_at DESC),
  CONSTRAINT chk_incidente_ack
    CHECK (acknowledged_at IS NULL OR acknowledged_at >= opened_at),
  CONSTRAINT chk_incidente_resolved
    CHECK (resolved_at IS NULL OR resolved_at >= opened_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sal_chequeo (
  id_chequeo                 CHAR(26)    PRIMARY KEY,
  id_tenant                  CHAR(26)    NOT NULL,
  triggered_by_id_usuario    CHAR(26)    NULL,
  trigger_type               ENUM('SCHEDULER','MANUAL_OPS') NOT NULL,
  status                     ENUM('SCHEDULED','RUNNING','DONE','FAILED') NOT NULL,
  started_at                 DATETIME(3) NULL,
  finished_at                DATETIME(3) NULL,
  summary_json               JSON        NULL,
  request_id                 VARCHAR(64) NULL,
  creado_en                  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sal_chequeo_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_sal_chequeo_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (triggered_by_id_usuario) REFERENCES gen_usuario(id_usuario),
  INDEX idx_chequeo_tenant_status (id_tenant, status, creado_en DESC),
  CONSTRAINT chk_chequeo_finished
    CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
) ENGINE=InnoDB;
