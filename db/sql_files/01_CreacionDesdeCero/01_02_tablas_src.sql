CREATE TABLE IF NOT EXISTS src_fuente (
  id_fuente       CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  id_site         CHAR(26)     NOT NULL,
  source_code     VARCHAR(64)  NOT NULL,
  source_type     ENUM('NVR','CAMERA','ANPR','SPEED_SENSOR','EDGE_CONNECTOR')
                  NOT NULL,
  display_name    VARCHAR(160) NOT NULL,
  status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  metadata_json   JSON         NULL,
  -- M6: último heartbeat/evento recibido de la fuente (NULL = aún sin reportar).
  last_heartbeat_at DATETIME(3) NULL,
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_src_fuente_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_src_fuente_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT uk_fuente_tenant_code UNIQUE (id_tenant, source_code),
  INDEX idx_fuente_site_type_status (id_site, source_type, status),
  INDEX idx_fuente_heartbeat (source_type, last_heartbeat_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS src_conector_edge (
  id_conector_edge   CHAR(26)    PRIMARY KEY,
  id_tenant          CHAR(26)    NOT NULL,
  id_site            CHAR(26)    NOT NULL,
  code               VARCHAR(64) NOT NULL,
  version            VARCHAR(32) NULL,
  status             ENUM('ACTIVE','INACTIVE','DEGRADED','OFFLINE')
                     NOT NULL DEFAULT 'ACTIVE',
  -- SHA-256 de la api key del conector (header x-api-key del ingest). Nunca en claro.
  api_key_hash       CHAR(64)    NULL,
  last_heartbeat_at  DATETIME(3) NULL,
  metadata_json      JSON        NULL,
  creado_en          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                  ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_src_conector_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_src_conector_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT uk_conector_edge_tenant_code UNIQUE (id_tenant, code),
  INDEX idx_conector_edge_tenant_status
    (id_tenant, status, last_heartbeat_at DESC),
  INDEX idx_conector_edge_api_key (api_key_hash)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS src_idempotencia_ingesta (
  id_idempotencia_ingesta  CHAR(26)     PRIMARY KEY,
  id_tenant                CHAR(26)     NOT NULL,
  endpoint_key             VARCHAR(64)  NOT NULL,
  idempotency_key          VARCHAR(128) NOT NULL,
  payload_hash             CHAR(64)     NOT NULL,
  resource_type            ENUM('EVENTO','EVENTO_VELOCIDAD','RAW_NVR') NOT NULL,
  resource_id              CHAR(26)     NOT NULL,
  first_seen_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at               DATETIME(3)  NOT NULL,
  CONSTRAINT fk_src_idemp_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_idempotencia_scope
    UNIQUE (id_tenant, endpoint_key, idempotency_key),
  INDEX idx_idempotencia_expires (expires_at),
  CONSTRAINT chk_idempotencia_expiracion CHECK (expires_at > first_seen_at)
) ENGINE=InnoDB;
