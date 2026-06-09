CREATE TABLE IF NOT EXISTS gen_tenant (
  id_tenant       CHAR(26)     PRIMARY KEY,
  code            VARCHAR(64)  NOT NULL,
  name            VARCHAR(160) NOT NULL,
  status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_tenant_code UNIQUE (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_site (
  id_site         CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  code            VARCHAR(64)  NOT NULL,
  name            VARCHAR(160) NOT NULL,
  timezone        VARCHAR(64)  NOT NULL DEFAULT 'America/Santiago',
  status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_site_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_site_tenant_code UNIQUE (id_tenant, code),
  INDEX idx_site_tenant_status (id_tenant, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_usuario (
  id_usuario      CHAR(26)     PRIMARY KEY,
  id_tenant       CHAR(26)     NOT NULL,
  email           VARCHAR(190) NOT NULL,
  full_name       VARCHAR(160) NOT NULL,
  role            ENUM('GUARD','ADMIN','OPS','SUPERADMIN_TNS') NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  status          ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  creado_en       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_usuario_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT uk_usuario_tenant_email UNIQUE (id_tenant, email),
  INDEX idx_usuario_tenant_role_status (id_tenant, role, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_acceso_sitio (
  id_usuario  CHAR(26)    NOT NULL,
  id_site     CHAR(26)    NOT NULL,
  granted_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id_usuario, id_site),
  CONSTRAINT fk_gen_acceso_sitio_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT fk_gen_acceso_sitio_id_site_gen_site_id_site
    FOREIGN KEY (id_site) REFERENCES gen_site(id_site)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_sesion (
  id_sesion           CHAR(26)     PRIMARY KEY,
  id_tenant           CHAR(26)     NOT NULL,
  id_usuario          CHAR(26)     NOT NULL,
  refresh_token_hash  VARCHAR(255) NOT NULL,
  issued_at           DATETIME(3)  NOT NULL,
  expires_at          DATETIME(3)  NOT NULL,
  revoked_at          DATETIME(3)  NULL,
  creado_en           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_gen_sesion_id_tenant_gen_tenant_id_tenant
    FOREIGN KEY (id_tenant) REFERENCES gen_tenant(id_tenant),
  CONSTRAINT fk_gen_sesion_id_usuario_gen_usuario_id_usuario
    FOREIGN KEY (id_usuario) REFERENCES gen_usuario(id_usuario),
  CONSTRAINT uk_sesion_refresh_hash UNIQUE (refresh_token_hash),
  INDEX idx_sesion_usuario_expires (id_usuario, expires_at),
  CONSTRAINT chk_sesion_expiracion CHECK (expires_at > issued_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_configuracion_grupos (
  id_configuracion_grupos  INT          PRIMARY KEY AUTO_INCREMENT,
  nombre                   VARCHAR(50)  NOT NULL,
  descripcion              TEXT         NULL,
  orden                    INT          NOT NULL DEFAULT 0,
  activo                   TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uk_configuracion_grupos_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_configuracion_parametros (
  id_configuracion_parametros  INT          PRIMARY KEY AUTO_INCREMENT,
  id_configuracion_grupos      INT          NOT NULL,
  ruta_completa                VARCHAR(255) NOT NULL,
  nombre_parametro             VARCHAR(100) NOT NULL,
  es_sensible                  TINYINT(1)   NOT NULL DEFAULT 0,
  es_requerido                 TINYINT(1)   NOT NULL DEFAULT 0,
  valor_default                TEXT         NULL,
  activo                       TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_gen_conf_param_grupo
    FOREIGN KEY (id_configuracion_grupos)
    REFERENCES gen_configuracion_grupos(id_configuracion_grupos),
  CONSTRAINT uk_configuracion_parametros_ruta UNIQUE (ruta_completa),
  INDEX idx_configuracion_parametros_ruta (ruta_completa),
  INDEX idx_configuracion_parametros_grupo_activo
    (id_configuracion_grupos, activo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gen_configuracion_valores (
  id_configuracion_valores     INT        PRIMARY KEY AUTO_INCREMENT,
  id_configuracion_parametros  INT        NOT NULL,
  valor                        TEXT       NOT NULL,
  version                      INT        NOT NULL DEFAULT 1,
  activo                       TINYINT(1) NOT NULL DEFAULT 1,
  valido_desde                 DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valido_hasta                 DATETIME   NULL,
  id_parametro_activo          INT GENERATED ALWAYS AS (
    CASE WHEN activo = 1 THEN id_configuracion_parametros ELSE NULL END
  ) STORED,
  CONSTRAINT fk_gen_conf_valores_parametro
    FOREIGN KEY (id_configuracion_parametros)
    REFERENCES gen_configuracion_parametros(id_configuracion_parametros),
  CONSTRAINT uk_configuracion_valores_version
    UNIQUE (id_configuracion_parametros, version),
  CONSTRAINT uk_configuracion_valores_parametro_activo
    UNIQUE (id_parametro_activo),
  INDEX idx_configuracion_valores_parametro_activo
    (id_configuracion_parametros, activo),
  CONSTRAINT chk_configuracion_valores_version CHECK (version > 0),
  CONSTRAINT chk_configuracion_valores_vigencia
    CHECK (valido_hasta IS NULL OR valido_hasta > valido_desde)
) ENGINE=InnoDB;
