-- 08_11: conector edge de desarrollo (HANDOFF §2 Paso 3).
-- El seed original no incluía filas en src_conector_edge, por lo que el ingest
-- con x-api-key no tenía contra qué validar. Crea el conector del sitio demo
-- con la clave de DESARROLLO 'dev-ingest-key' (hash SHA-256).
-- ⚠️ ROTAR la clave antes del go-live (ver 08_08).

USE tns_cctv;

INSERT INTO src_conector_edge (
  id_conector_edge,
  id_tenant,
  id_site,
  code,
  version,
  status,
  api_key_hash,
  metadata_json
) VALUES (
  'CE000000000000000000000001',
  'TN000000000000000000000001',
  'ST000000000000000000000001',
  'conector-agrolivo-01',
  '0.1.0',
  'ACTIVE',
  SHA2('dev-ingest-key', 256),
  JSON_OBJECT('descripcion', 'Conector edge NVR Dahua — Parque Agrolivo')
)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  api_key_hash = VALUES(api_key_hash);
