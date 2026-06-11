CREATE TABLE IF NOT EXISTS dah_evento_crudo (
  id_evento_crudo  CHAR(26)    PRIMARY KEY,
  id_tenant        CHAR(26)    NOT NULL,
  id_fuente        CHAR(26)    NOT NULL,
  channel          INT         NOT NULL,
  event_code       VARCHAR(64) NOT NULL,
  action           ENUM('Start','Stop','Pulse') NOT NULL,
  received_at      DATETIME(3) NOT NULL,
  payload_json     JSON        NOT NULL,
  processed        TINYINT(1)  NOT NULL DEFAULT 0,
  id_evento        CHAR(26)    NULL,
  creado_en        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_crudo_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_crudo_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT fk_dah_evt_crudo_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_evento_crudo_tenant_time (id_tenant, received_at DESC),
  INDEX idx_evento_crudo_code_time
    (id_fuente, event_code, received_at DESC),
  INDEX idx_evento_crudo_pending (processed, received_at ASC),
  CONSTRAINT chk_evento_crudo_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_deteccion_facial (
  id_deteccion_facial  CHAR(26)      PRIMARY KEY,
  id_tenant            CHAR(26)      NOT NULL,
  id_evento_crudo      CHAR(26)      NOT NULL,
  id_fuente            CHAR(26)      NOT NULL,
  channel              INT           NOT NULL,
  detected_at          DATETIME(3)   NOT NULL,
  sex                  ENUM('Man','Woman','Unknown') NOT NULL DEFAULT 'Unknown',
  age                  TINYINT UNSIGNED NULL,
  has_glasses          TINYINT(1)    NULL,
  has_mask             TINYINT(1)    NULL,
  has_beard            TINYINT(1)    NULL,
  snapshot_path        VARCHAR(512)  NULL,
  creado_en            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_det_facial_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_det_facial_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_det_facial_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_deteccion_facial_tenant_time (id_tenant, detected_at DESC),
  INDEX idx_deteccion_facial_fuente_time (id_fuente, detected_at DESC),
  CONSTRAINT chk_deteccion_facial_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_reconocimiento_facial (
  id_reconocimiento_facial  CHAR(26)      PRIMARY KEY,
  id_tenant                 CHAR(26)      NOT NULL,
  id_deteccion_facial       CHAR(26)      NOT NULL,
  rec_result                TINYINT(1)    NOT NULL,
  similarity                TINYINT UNSIGNED NULL,
  person_name               VARCHAR(128)  NULL,
  person_id                 VARCHAR(64)   NULL,
  person_group_id           VARCHAR(64)   NULL,
  certificate_type          ENUM('IC','Passport','Unknown') NULL,
  scene_image_path          VARCHAR(512)  NULL,
  creado_en                 DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_rec_facial_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_rec_facial_id_det_facial_dah_det_facial_id_det_facial
    FOREIGN KEY (id_deteccion_facial)
    REFERENCES dah_deteccion_facial(id_deteccion_facial),
  INDEX idx_reconocimiento_facial_person (id_tenant, person_id),
  INDEX idx_reconocimiento_facial_deteccion (id_deteccion_facial),
  CONSTRAINT chk_reconocimiento_facial_similarity
    CHECK (similarity IS NULL OR similarity BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_deteccion_vehiculo (
  id_deteccion_vehiculo  CHAR(26)      PRIMARY KEY,
  id_tenant              CHAR(26)      NOT NULL,
  id_evento_crudo        CHAR(26)      NOT NULL,
  id_fuente              CHAR(26)      NOT NULL,
  channel                INT           NOT NULL,
  detected_at            DATETIME(3)   NOT NULL,
  plate_number           VARCHAR(16)   NULL,
  plate_type             VARCHAR(32)   NULL,
  plate_color            VARCHAR(32)   NULL,
  vehicle_color          VARCHAR(32)   NULL,
  country_code           CHAR(2)       NULL,
  speed_kmh              SMALLINT UNSIGNED NULL,
  traffic_event          VARCHAR(64)   NULL,
  snapshot_path          VARCHAR(512)  NULL,
  creado_en              DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_det_veh_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_det_veh_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_det_veh_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_deteccion_vehiculo_plate
    (id_tenant, plate_number, detected_at DESC),
  INDEX idx_deteccion_vehiculo_fuente (id_fuente, detected_at DESC),
  CONSTRAINT chk_deteccion_vehiculo_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_evento_ivs (
  id_evento_ivs    CHAR(26)     PRIMARY KEY,
  id_tenant        CHAR(26)     NOT NULL,
  id_evento_crudo  CHAR(26)     NOT NULL,
  id_fuente        CHAR(26)     NOT NULL,
  channel          INT          NOT NULL,
  triggered_at     DATETIME(3)  NOT NULL,
  rule_name        VARCHAR(128) NULL,
  rule_type        VARCHAR(64)  NOT NULL,
  action           VARCHAR(32)  NOT NULL,
  object_type      VARCHAR(32)  NULL,
  creado_en        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_ivs_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_ivs_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_evt_ivs_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_ivs_tenant_time (id_tenant, triggered_at DESC),
  INDEX idx_evento_ivs_rule_type (id_fuente, rule_type, triggered_at DESC),
  CONSTRAINT chk_evento_ivs_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_evento_audio (
  id_evento_audio      CHAR(26)    PRIMARY KEY,
  id_tenant            CHAR(26)    NOT NULL,
  id_evento_crudo      CHAR(26)    NOT NULL,
  id_fuente            CHAR(26)    NOT NULL,
  channel              INT         NOT NULL,
  detected_at          DATETIME(3) NOT NULL,
  sound_type           VARCHAR(64) NOT NULL,
  intensity_threshold  TINYINT UNSIGNED NULL,
  creado_en            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_evt_audio_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_evt_audio_id_evt_crudo_dah_evt_crudo_id_evt_crudo
    FOREIGN KEY (id_evento_crudo) REFERENCES dah_evento_crudo(id_evento_crudo),
  CONSTRAINT fk_dah_evt_audio_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  INDEX idx_evento_audio_tenant_time (id_tenant, detected_at DESC),
  INDEX idx_evento_audio_type (id_fuente, sound_type, detected_at DESC),
  CONSTRAINT chk_evento_audio_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_archivo_grabacion (
  id_archivo_grabacion  CHAR(26)      PRIMARY KEY,
  id_tenant             CHAR(26)      NOT NULL,
  id_fuente             CHAR(26)      NOT NULL,
  channel               INT           NOT NULL,
  start_time            DATETIME      NOT NULL,
  end_time              DATETIME      NOT NULL,
  file_type             ENUM('dav','mp4','jpg') NOT NULL,
  video_stream          ENUM('Main','Extra1','Extra2','Extra3')
                        NOT NULL DEFAULT 'Main',
  file_path             VARCHAR(512)  NOT NULL,
  duration_seconds      SMALLINT UNSIGNED NULL,
  file_size_bytes       INT UNSIGNED  NULL,
  events_json           JSON          NULL,
  fetched_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_arch_gra_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_arch_gra_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT uk_archivo_grabacion_fuente_path UNIQUE (id_fuente, file_path),
  INDEX idx_archivo_grabacion_tenant_time (id_tenant, start_time DESC),
  INDEX idx_archivo_grabacion_fuente_time (id_fuente, start_time DESC),
  CONSTRAINT chk_archivo_grabacion_channel CHECK (channel >= 0),
  CONSTRAINT chk_archivo_grabacion_time CHECK (end_time >= start_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_snapshot (
  id_snapshot      CHAR(26)      PRIMARY KEY,
  id_tenant        CHAR(26)      NOT NULL,
  id_fuente        CHAR(26)      NOT NULL,
  id_evento        CHAR(26)      NULL,
  channel          INT           NOT NULL,
  captured_at      DATETIME(3)   NOT NULL,
  `trigger`        ENUM('ON_DEMAND','EVENT','SCHEDULED') NOT NULL,
  storage_uri      VARCHAR(1024) NOT NULL,
  mime_type        VARCHAR(64)   NULL,
  sha256           CHAR(64)      NULL,
  width_px         SMALLINT UNSIGNED NULL,
  height_px        SMALLINT UNSIGNED NULL,
  file_size_bytes  INT UNSIGNED  NULL,
  creado_en        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_dah_snapshot_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_snapshot_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT fk_dah_snapshot_id_evento_ale_evento_id_evento
    FOREIGN KEY (id_evento) REFERENCES ale_evento(id_evento),
  INDEX idx_snapshot_tenant_time (id_tenant, captured_at DESC),
  INDEX idx_snapshot_fuente_time (id_fuente, captured_at DESC),
  INDEX idx_snapshot_evento (id_evento),
  CONSTRAINT chk_snapshot_channel CHECK (channel >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dah_suscripcion (
  id_suscripcion     CHAR(26)     PRIMARY KEY,
  id_tenant          CHAR(26)     NOT NULL,
  id_fuente          CHAR(26)     NOT NULL,
  channel            INT          NULL,
  event_codes_json   JSON         NOT NULL,
  status             ENUM('ACTIVE','INACTIVE','ERROR') NOT NULL DEFAULT 'ACTIVE',
  last_heartbeat_at  DATETIME(3)  NULL,
  error_message      VARCHAR(255) NULL,
  creado_en          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                   ON UPDATE CURRENT_TIMESTAMP(3),
  subscription_scope VARCHAR(16) GENERATED ALWAYS AS (
    COALESCE(CAST(channel AS CHAR), 'ALL')
  ) STORED,
  CONSTRAINT fk_dah_suscripcion_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_dah_suscripcion_id_fuente_src_fuente_id_fuente
    FOREIGN KEY (id_fuente) REFERENCES src_fuente(id_fuente),
  CONSTRAINT uk_suscripcion_fuente_channel
    UNIQUE (id_fuente, subscription_scope),
  INDEX idx_suscripcion_tenant_status
    (id_tenant, status, actualizado_en DESC),
  CONSTRAINT chk_suscripcion_channel CHECK (channel IS NULL OR channel >= 0)
) ENGINE=InnoDB;
