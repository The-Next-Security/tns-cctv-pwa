-- 08_10: push real Web Push/VAPID (HANDOFF §2 Paso 4, decisión D9).
-- 1) Canal PUSH en ale_notificacion (registro de cada envío).
-- 2) Suscripciones push por usuario (endpoint + claves del navegador).

USE tns_cctv;

ALTER TABLE ale_notificacion
  MODIFY COLUMN channel ENUM('IN_APP','WS','EMAIL_INTERNAL','PUSH') NOT NULL;

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
