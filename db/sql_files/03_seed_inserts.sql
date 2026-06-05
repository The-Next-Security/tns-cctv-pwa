-- Sample seed data for local development and contract validation.

INSERT INTO tenants (id, code, name, status)
VALUES ('tn_01cctv000000000000000001', 'tns-demo', 'TNS Demo', 'ACTIVE');

INSERT INTO sites (id, tenant_id, code, name, timezone, status)
VALUES ('st_01cctv000000000000000001', 'tn_01cctv000000000000000001', 'main', 'Planta Principal', 'America/Santiago', 'ACTIVE');

INSERT INTO users (id, tenant_id, email, full_name, role, password_hash, status)
VALUES ('usr_01cctv00000000000000001', 'tn_01cctv000000000000000001', 'guardia@tenant.cl', 'Guardia Demo', 'GUARD', '$2a$10$demo.hash.placeholder', 'ACTIVE');

INSERT INTO user_site_access (user_id, site_id)
VALUES ('usr_01cctv00000000000000001', 'st_01cctv000000000000000001');

INSERT INTO sources (id, tenant_id, site_id, source_code, source_type, display_name, status)
VALUES ('src_01cctv00000000000000001', 'tn_01cctv000000000000000001', 'st_01cctv000000000000000001', 'src_nvr1', 'NVR', 'NVR Principal', 'ACTIVE');
