-- 08_08: API key máquina-a-máquina para el ingest (HANDOFF §2 Paso 2).
-- La clave NUNCA se almacena en claro: solo su hash SHA-256 (64 hex).
-- El conector edge envía la clave en el header x-api-key y el backend la
-- valida contra src_conector_edge.api_key_hash (estado ACTIVE).

USE tns_cctv;

ALTER TABLE src_conector_edge
  ADD COLUMN api_key_hash CHAR(64) NULL AFTER status,
  ADD INDEX idx_conector_edge_api_key (api_key_hash);

-- Clave de DESARROLLO para los conectores existentes ('dev-ingest-key').
-- ⚠️ ROTAR antes del go-live: generar clave fuerte por conector y actualizar
--    api_key_hash = SHA2('<clave-nueva>', 256).
UPDATE src_conector_edge
   SET api_key_hash = SHA2('dev-ingest-key', 256)
 WHERE api_key_hash IS NULL;
