-- 08_12: corrige bug del ingest con eventos sin regla coincidente.
-- mysqlStore registra resource_type='RAW_NVR' cuando un evento queda solo en
-- dah_evento_crudo (ninguna regla matcheó), pero el enum original no incluía
-- ese valor → "Data truncated for column 'resource_type'" y HTTP 500.

USE tns_cctv;

ALTER TABLE src_idempotencia_ingesta
  MODIFY COLUMN resource_type ENUM('EVENTO','EVENTO_VELOCIDAD','RAW_NVR') NOT NULL;
