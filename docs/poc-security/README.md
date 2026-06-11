# PoC de seguridad — ARCHIVADO (decisión D1)

> Archivado el 2026-06-11 según `HANDOFF.md` §2 Paso 1 y `PRD-V2.md` (decisión D1).

Este código era el backend alternativo `backend/src/` y **NO se fusiona** con el backend
activo (`src/`). Se conserva como referencia porque sus patrones de seguridad
(middleware JWT, manejo de roles, tests de autorización) se portan al backend real
como tickets independientes (ver Paso 2 del HANDOFF).

- `src/app.js` — Express PoC con middleware de auth.
- `tests/security.test.js` — tests de referencia de autorización.

No se ejecuta ni se importa desde ninguna parte de la aplicación. La suite de tests
del proyecto ya no incluye `docs/poc-security/`.
