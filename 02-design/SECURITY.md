# SECURITY.md

<!-- ARC_TASK:t_57457627 -->

## 1. Objetivo
Controles de seguridad para MVP CCTV: JWT, RBAC, aislamiento multi-tenant, secretos, CORS y auditoría.

## 2. Auth JWT (M1)
- Access token corto (ej. 15 min).
- Refresh token persistido como hash en `auth_sessions`.
- Logout revoca refresh.
- Claims mínimos: `sub`, `tenant_id`, `role`, `site_ids`, `iat`, `exp`, `jti`.
- Firma recomendada: RS256/ES256 con `kid` para rotación.

## 3. Autorización RBAC (M13)
Roles:
- GUARD
- ADMIN
- OPS
- SUPERADMIN_TNS

Reglas:
1) Deny-by-default.
2) Verificar rol + tenant + site scope en cada endpoint.
3) Endpoints sensibles:
- `/rules*` solo ADMIN/SUPERADMIN_TNS.
- `/health/checks/run` solo OPS/SUPERADMIN_TNS.

## 4. Multi-tenant estricto
- Todas las tablas de dominio incluyen `tenant_id`.
- Toda query debe filtrar `tenant_id`.
- Evidencia por prefijo aislado (`/<tenant_id>/...`).
- WS separado por topics tenant/site.

## 5. Seguridad de ingesta edge
- Credencial técnica por conector tenant/site.
- TLS obligatorio.
- `X-Idempotency-Key` + hash payload para deduplicación/replay control.
- Validar `tenant_id/site_id` contra identidad del conector.

## 6. CORS
- Allowlist explícita de origins (sin wildcard abierto).
- Métodos: GET, POST, PATCH, DELETE, OPTIONS.
- Headers permitidos: Authorization, Content-Type, X-Request-Id, X-Idempotency-Key.
- No combinar `*` con credenciales.

## 7. Gestión de secretos
- Secretos solo en vault/env seguros, nunca en repo.
- Rotación de claves JWT y credenciales técnicas.
- Mínimo privilegio por servicio.
- Enmascarar secretos en logs.

## 8. Hardening API/WS
- Rate limit por IP/user/tenant.
- Protección brute force en login.
- Límite de tamaño payload.
- Sanitización de campos texto (`comment`, `notes`).
- WS heartbeat obligatorio y cierre en token inválido/expirado.

## 9. Auditoría (M14)
- Propagar `X-Request-Id` en todo request/response.
- Registrar acciones críticas en `api_audit_log`.
- Registrar timeline en cambios de estado y correlaciones manuales.

Eventos a auditar:
- login fail/success
- refresh/logout
- cambios reglas
- cambios estado evento
- correlación manual speed case
- ejecución manual health check

## 10. Retención y privacidad
- Minimizar PII en responses según rol.
- Audit y timeline: 12 meses.
- Evidencia pesada: 90 días (ajustable por política).
- URLs firmadas de evidencia con expiración corta.

## 11. Riesgos y mitigación
1) Fuga cross-tenant -> guardrails de repositorio + pruebas negativas.
2) Token comprometido -> expiración corta + revocación refresh + rotación claves.
3) CORS mal configurado -> checklist de release y validación automática.
4) Conector comprometido -> credenciales por sitio, revocación inmediata, rotación.