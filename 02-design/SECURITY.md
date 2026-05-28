# Security Design — MVP CCTV

## 1. Objetivo

Asegurar confidencialidad, integridad, disponibilidad y aislamiento multi-tenant para eventos de seguridad, evidencias y operaciones del parque.

## 2. Autenticación (JWT)

Modelo:
- Access token JWT (vida corta: 60 min).
- Refresh token rotatorio (vida 7 días, revocable).
- Tokens firmados con clave asimétrica (RS256 recomendado).

Claims mínimas:
- sub: user_id
- tenant_id
- site_ids autorizados
- role
- jti
- exp, iat

Flujos:
- login -> access + refresh
- refresh -> nuevo access (+ opcional rotación refresh)
- logout -> invalidación refresh/jti en denylist temporal

Buenas prácticas:
- password hash con Argon2id o bcrypt cost alto.
- rate limiting en login y bloqueo progresivo por intentos.
- sesión con device fingerprint opcional (MVP simple: ip+ua hash).

## 3. Autorización (RBAC + tenancy)

Roles MVP:
- GUARD
- ADMIN
- OPS
- SUPERADMIN_TNS

Reglas:
- Toda query incluye tenant_id obligatorio.
- Acceso por site_id filtrado por permisos del usuario.
- SUPERADMIN_TNS solo para operaciones cross-tenant explícitas.

Aplicación técnica:
- Policy middleware en backend valida role + scope.
- Repositorios SQL aplican tenant_id/site_id en cada consulta (sin excepciones).
- Prohibido usar endpoints sin scoping multi-tenant.

## 4. Seguridad de conectividad parque-cloud

- Conector en parque inicia túnel saliente TLS (no inbound público a NVR/cámaras).
- mTLS recomendado entre edge connector y core API.
- Credenciales de conector por tenant/site, revocables.
- Heartbeat firmado para detectar spoofing/desconexión.

## 5. Secretos y credenciales

Fuentes permitidas:
- Secret Manager (Vault/SSM/GCP Secret Manager) o variables de entorno cifradas en runtime.

Política:
- Nunca secretos en repositorio.
- Rotación trimestral mínima para claves API y credenciales de integraciones.
- Claves JWT privadas con control de acceso estricto y auditoría.
- Separación por entorno (dev/stage/prod) y por tenant cuando aplique.

## 6. CORS y seguridad de APIs

CORS:
- allowlist explícita de orígenes front (guardia/admin/ops).
- Métodos permitidos mínimos: GET, POST, PATCH.
- Credentials habilitadas solo cuando sea necesario.

Headers de seguridad:
- Content-Security-Policy (frontend).
- X-Content-Type-Options: nosniff.
- X-Frame-Options: DENY.
- Referrer-Policy: strict-origin-when-cross-origin.
- HSTS en dominios HTTPS.

Protección API:
- Validación estricta de payload (schema validation).
- Rate limits por IP + por user + por conector.
- Idempotency-key en ingestión para evitar duplicados por retry.

## 7. Seguridad de evidencia y archivos

- Evidencia en object storage privado (bucket no público).
- Acceso mediante URL firmada con TTL corto.
- Hash checksum de evidencias críticas (sha256) para trazabilidad.
- Lifecycle policy para expiración según retención definida.

## 8. Auditoría y trazabilidad

Auditar como mínimo:
- login/logout/refresh
- cambios de estado de eventos
- cambios de reglas
- correlaciones manuales
- envíos de notificación
- acciones de OPS sobre salud técnica

Formato:
- actor, acción, entidad, antes/después (diff cuando aplique), timestamp, request_id.
- logs inmutables por 12 meses mínimo.

## 9. Privacidad y minimización de datos

- Guardar solo datos necesarios para operación y trazabilidad del PRD.
- Evitar almacenar PII extra no requerida.
- Campos sensibles (identificadores de visitantes) con acceso restringido por rol.
- Política clara de retención y purga.

## 10. Threat model resumido y mitigaciones

1) Robo de token JWT
- Mitigación: vida corta, revocación refresh, HTTPS, detección anomalías.

2) Acceso cruzado entre tenants
- Mitigación: tenancy guard en middleware + constraints en queries + pruebas negativas.

3) Exposición de NVR/cámaras a internet
- Mitigación: solo túnel saliente; sin NAT/port-forward inbound.

4) Reenvío duplicado de eventos por red inestable
- Mitigación: idempotency key + fingerprint dedup.

5) Manipulación de evidencia
- Mitigación: almacenamiento append-only lógico + checksum + auditoría de acceso.

6) Fuerza bruta en login
- Mitigación: rate limiting + lock temporal + alertas.

## 11. Controles de seguridad en CI/CD y operación

- SAST básico en backend/frontend.
- Escaneo de dependencias (CVEs críticas bloqueantes).
- IaC/infra con revisión de secretos y permisos mínimos.
- Backups cifrados MySQL diarios + pruebas de restore.

## 12. Checklist de aceptación de seguridad MVP

- JWT + refresh implementados y testeados.
- RBAC y aislamiento tenant/site verificados con pruebas de autorización negativa.
- CORS en allowlist, sin wildcard en producción.
- Secretos fuera de repo y rotables.
- Evidencia accesible solo por URL firmada temporal.
- Auditoría activa en operaciones críticas.
