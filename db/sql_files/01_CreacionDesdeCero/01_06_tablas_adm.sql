CREATE TABLE IF NOT EXISTS adm_ingreso (
  id_ingreso             CHAR(26)     PRIMARY KEY,
  id_tenant              CHAR(26)     NOT NULL,
  id_site                CHAR(26)     NOT NULL,
  plate                  VARCHAR(16)  NULL,
  visitor_id             VARCHAR(64)  NULL,
  visitor_name           VARCHAR(160) NULL,
  destination_company    VARCHAR(160) NOT NULL,
  source_type            ENUM('MANUAL','ANPR','HYBRID') NOT NULL,
  vehicle_type           ENUM('PARTICULAR','CAMION','MOTO','UTILITARIO','OTRO') NULL,
  anpr_confidence        TINYINT UNSIGNED NULL,
  entry_at               DATETIME(3)  NOT NULL,
  exit_at                DATETIME(3)  NULL,
  notes                  TEXT         NULL,
  review_required        TINYINT(1)   NOT NULL DEFAULT 0,
  created_by_id_usuario  CHAR(26)     NOT NULL,
  updated_by_id_usuario  CHAR(26)     NULL,
  creado_en              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                        ON UPDATE CURRENT_TIMESTAMP(3),
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

CREATE TABLE IF NOT EXISTS adm_evento_velocidad (
  id_evento_velocidad  CHAR(26)      PRIMARY KEY,
  id_tenant            CHAR(26)      NOT NULL,
  id_site              CHAR(26)      NOT NULL,
  id_fuente            CHAR(26)      NOT NULL,
  external_event_id    VARCHAR(128)  NULL,
  plate                VARCHAR(16)   NULL,
  speed_kph            DECIMAL(6,2)  NOT NULL,
  speed_limit_kph      DECIMAL(6,2)  NOT NULL,
  occurred_at          DATETIME(3)   NOT NULL,
  payload_version      VARCHAR(16)   NOT NULL DEFAULT '1.0',
  raw_payload_json     JSON          NOT NULL,
  request_id           VARCHAR(64)   NULL,
  creado_en            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_evt_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_evt_vel_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_adm_evt_vel_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_velocidad_tenant_time (id_tenant, occurred_at DESC),
  INDEX idx_evento_velocidad_plate (id_tenant, plate, occurred_at DESC),
  CONSTRAINT chk_evento_velocidad_speed CHECK (speed_kph >= 0),
  CONSTRAINT chk_evento_velocidad_limit CHECK (speed_limit_kph > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS adm_evidencia_velocidad (
  id_evidencia_velocidad  CHAR(26)      PRIMARY KEY,
  id_tenant               CHAR(26)      NOT NULL,
  id_evento_velocidad     CHAR(26)      NOT NULL,
  kind                    ENUM('SNAPSHOT','CLIP','IMAGE','VIDEO','OTHER')
                          NOT NULL,
  storage_uri             VARCHAR(1024) NOT NULL,
  mime_type               VARCHAR(128)  NULL,
  sha256                  CHAR(64)      NULL,
  creado_en               DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_ev_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_ev_vel_id_evt_vel_adm_evt_vel_id_evt_vel
    FOREIGN KEY (id_evento_velocidad)
    REFERENCES adm_evento_velocidad(id_evento_velocidad),
  INDEX idx_evidencia_velocidad_evento (id_evento_velocidad)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS adm_caso_velocidad (
  id_caso_velocidad           CHAR(26)      PRIMARY KEY,
  id_tenant                   CHAR(26)      NOT NULL,
  id_site                     CHAR(26)      NOT NULL,
  id_evento_velocidad         CHAR(26)      NOT NULL,
  state                       ENUM(
                                'OPEN',
                                'CORRELATED_AUTO',
                                'CORRELATED_MANUAL',
                                'CLOSED'
                              ) NOT NULL DEFAULT 'OPEN',
  correlation_status          ENUM(
                                'PENDING',
                                'CORRELATED_AUTO',
                                'CORRELATED_MANUAL',
                                'MANUAL_REVIEW_REQUIRED',
                                'NO_MATCH'
                              ) NOT NULL DEFAULT 'PENDING',
  confidence_score            DECIMAL(5,4)  NULL,
  correlation_window_minutes  INT           NOT NULL DEFAULT 120,
  matched_id_ingreso          CHAR(26)      NULL,
  manual_review_required      TINYINT(1)    NOT NULL DEFAULT 0,
  correlation_reason          VARCHAR(255)  NULL,
  creado_en                   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en              DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_caso_vel_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_caso_vel_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site),
  CONSTRAINT fk_adm_caso_vel_id_evt_vel_adm_evt_vel_id_evt_vel
    FOREIGN KEY (id_evento_velocidad)
    REFERENCES adm_evento_velocidad(id_evento_velocidad),
  CONSTRAINT fk_adm_caso_vel_id_ingreso_adm_ingreso_id_ingreso
    FOREIGN KEY (matched_id_ingreso) REFERENCES adm_ingreso(id_ingreso),
  CONSTRAINT uk_caso_velocidad_evento UNIQUE (id_evento_velocidad),
  INDEX idx_caso_velocidad_tenant_state (id_tenant, state, creado_en DESC),
  INDEX idx_caso_velocidad_correlation
    (id_tenant, correlation_status, creado_en DESC),
  CONSTRAINT chk_caso_velocidad_confidence
    CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
  CONSTRAINT chk_caso_velocidad_window CHECK (correlation_window_minutes > 0),
  CONSTRAINT chk_caso_velocidad_manual_reason CHECK (
    correlation_status <> 'CORRELATED_MANUAL'
    OR (
      matched_id_ingreso IS NOT NULL
      AND correlation_reason IS NOT NULL
      AND CHAR_LENGTH(TRIM(correlation_reason)) > 0
    )
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS adm_candidato_correlacion (
  id_candidato_correlacion  CHAR(26)      PRIMARY KEY,
  id_tenant                 CHAR(26)      NOT NULL,
  id_caso_velocidad         CHAR(26)      NOT NULL,
  id_ingreso                CHAR(26)      NOT NULL,
  score                     DECIMAL(5,4)  NOT NULL,
  reason                    VARCHAR(255)  NULL,
  selected                  TINYINT(1)    NOT NULL DEFAULT 0,
  creado_en                 DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_adm_cand_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_adm_cand_id_caso_adm_caso_vel_id_caso_vel
    FOREIGN KEY (id_caso_velocidad)
    REFERENCES adm_caso_velocidad(id_caso_velocidad),
  CONSTRAINT fk_adm_cand_id_ingreso_adm_ingreso_id_ingreso
    FOREIGN KEY (id_ingreso) REFERENCES adm_ingreso(id_ingreso),
  CONSTRAINT uk_candidato_caso_ingreso
    UNIQUE (id_caso_velocidad, id_ingreso),
  INDEX idx_candidato_correlacion_caso_score
    (id_caso_velocidad, score DESC),
  CONSTRAINT chk_candidato_correlacion_score CHECK (score BETWEEN 0 AND 1)
) ENGINE=InnoDB;

SET @fk_notificacion_caso_exists = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME = 'fk_ale_notif_id_caso_adm_caso_id_caso'
);

SET @add_fk_notificacion_caso = IF(
  @fk_notificacion_caso_exists = 0,
  'ALTER TABLE ale_notificacion
     ADD CONSTRAINT fk_ale_notif_id_caso_adm_caso_id_caso
     FOREIGN KEY (id_caso_velocidad)
     REFERENCES adm_caso_velocidad(id_caso_velocidad)',
  'SELECT 1'
);

PREPARE stmt_add_fk_notificacion_caso FROM @add_fk_notificacion_caso;
EXECUTE stmt_add_fk_notificacion_caso;
DEALLOCATE PREPARE stmt_add_fk_notificacion_caso;
