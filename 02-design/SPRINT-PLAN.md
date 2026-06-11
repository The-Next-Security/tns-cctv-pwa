# SPRINT-PLAN.md

## Objetivo

Tablero de estado basado en el **código actual** (2026-06-11) y priorización realista para un tercero que continúe el proyecto. No es un plan teórico de sprints futuros.

**Documento de entrada:** `PRD-PRODUCTO.md`.

---

## Estado global

### Lo que SÍ existe e integra

- Frontend Next.js 16 maduro con design system.
- **Login real** → MySQL (`gen_usuario`, bcrypt, JWT).
- **Consola operativa E2E** → `GET/POST /alerts` → `ale_evento` + SP.
- Backend Express + MySQL (`STORE=mysql` en dev estándar).
- Ingest NVR + motor reglas + WS `event.popup`.
- Recepción vehicular parcial (`adm_ingreso`).
- Admin usuarios parcial (`gen_usuario` CRUD).
- Health en top bar (ping MySQL + NVRs).
- Bundle SQL prefijado (36 tablas) verificado con `db:verify`.
- Scripts demo: `demo:clean`, `db:seed-nvr`.

### Lo que NO está integrado o está incompleto

- Auth session revalidation (`/auth/me`, refresh, logout).
- Middleware JWT en API.
- `GET /alerts/:id` (detalle roto).
- Reglas UI ↔ backend (UI en mock, backend solo GET).
- Expedientes, reportes, salud página — mock/estático.
- Streaming CCTV real.
- Notificaciones push server-side.
- `llamada_at` persistente.
- Unificación `src/` vs `backend/src/`.
- Suite `npm test` como gate CI confiable.

---

## Matriz por workstream

| Workstream | Estado | Evidencia | Virtud | Defecto principal |
|------------|--------|-----------|--------|-------------------|
| UI / design system | ✅ Implementado | `app/`, `components/ui/`, `styles/` | Consistencia visual | Algunos mocks visuales mezclados con real |
| Auth login | ✅ Real | `auth-provider.tsx`, `POST /auth/login` | Bcrypt + JWT | Sesión no revalidada |
| Auth enforcement API | ❌ | `src/app.js` sin middleware | JWT emitido | Endpoints abiertos |
| Consola operativa | ✅ E2E | `operacion/page.tsx`, `mysqlStore` | UX optimista + SP | Errores silenciados |
| Escalación UI | ⚠️ Parcial | `escalate-sheet.tsx`, `escalation.ts` | Checklist + contactos | Notificaciones simuladas; `llamada_at` local |
| Realtime | ⚠️ Parcial | `use-realtime.ts`, `wsHub.js` | WS nativo alineado | Solo `event.popup`; sin auth |
| Reglas | ⚠️ Divergente | `reglas/page.tsx` vs `GET /rules` | Backend lee BD | UI 100% mock |
| Recepción | ⚠️ Parcial | `recepcion/page.tsx` | CRUD real ingresos | Tenants/ANPR mock |
| Expedientes | ❌ Mock | `mock-case-files-api.ts` | UI completa | Sin backend |
| Reportes | ❌ Estático | `reportes/page.tsx` | Layout listo | Sin datos reales |
| Salud técnica | ⚠️ Mixto | header real / página estática | Ping DB funciona | `/salud` no usa API |
| Admin usuarios | ⚠️ Parcial | `admin/usuarios/page.tsx` | CRUD real | Fallback mock silencioso |
| Admin zonas/cámaras/NVR | ❌ Mock | `admin/*/page.tsx` | UI scaffold | Sin API |
| Streaming/media | ❌ Demo | `demo-media.ts`, `live-camera-panel` | UX validada | Cero CCTV real |
| SQL / BD | ✅ Operativo | `crear_base_datos.sql`, verify | Modelo completo | SOURCE no batch-friendly |
| Backend PoC seguridad | ⚠️ Huérfano | `backend/src/` | Patrones probados | No integrado |
| Tests CI | ⚠️ Inestable | `vitest`, `tests/*.spec.js` | Contratos escritos | Mezcla CJS/ESM, deps |

---

## Backend `src/` — capabilities

| Capability | Estado |
|------------|--------|
| Login | ✅ |
| Ingest + idempotencia | ✅ |
| Motor reglas → alertas | ✅ |
| List/attend alertas | ✅ |
| CRUD usuarios | ✅ |
| GET reglas | ✅ |
| CRUD ingresos | ✅ |
| Health system/nvrs | ✅ |
| Events list/detail/state (interno) | ✅ |
| Auth middleware | ❌ |
| GET alert by id | ❌ |
| CRUD reglas | ❌ |
| Case files / reports | ❌ |
| Evidence sign | ❌ |
| Audit logs API | ❌ |

---

## Frontend — módulos

| Módulo | Fuente datos | Persiste acciones |
|--------|--------------|-------------------|
| `/operacion` | API MySQL | ✅ (best-effort) |
| `/login` | API MySQL | ✅ token local |
| `/recepcion` | API + mock fallback | ✅ parcial |
| `/reglas` | `MOCK_RULES` local | ❌ solo React state |
| `/expedientes` | mock fallback | ❌ |
| `/reportes` | hardcoded | ❌ |
| `/salud` | hardcoded | ❌ |
| `/admin/usuarios` | API + mock fallback | ✅ |
| `/admin/*` resto | mock | ❌ |
| `/operacion/alerta/[id]` | API (404) | ❌ roto |

---

## Deuda técnica priorizada

### P0 — Bloquea evaluación honesta / demo estable

1. Implementar `GET /alerts/:id` o redirigir detalle a popup existente.
2. Unificar `attend()` vs `attendEvent()` en todos los componentes.
3. Mostrar errores API en operación (no `.catch` vacío).
4. Actualizar `INSTRUCCIONES_ACCESO.md` y texto login ("cualquier password").

### P1 — Camino a staging

5. Middleware JWT + `/auth/me`.
6. Conectar UI reglas a `GET /rules`; implementar CRUD backend.
7. Persistir `llamada_at` en timeline o columna.
8. Autenticar WebSocket.
9. Decidir destino de `backend/src/` (fusionar o archivar).

### P2 — Producción

10. Streaming real o integración snapshots desde `dah_snapshot`.
11. Notificaciones push server-side.
12. Expedientes + reportes backend.
13. RBAC por endpoint desde `gen_permiso`.
14. Rehabilitar `npm test` en CI.
15. CORS allowlist + secretos por ambiente.

---

## Plan de ejecución sugerido (fases)

### Fase 1 — Consolidación API operativa (1–2 semanas)

- P0 completo
- Auth middleware mínimo
- `GET /alerts/:id`

### Fase 2 — Módulos admin y reglas (2–3 semanas)

- Reglas UI ↔ backend CRUD
- Reducir mocks admin (zonas, fuentes)
- Persistir escalación (`llamada_at`, observaciones)

### Fase 3 — Media y notificaciones (3+ semanas)

- Pipeline evidencia NVR
- Push real
- Streaming MVP (HLS o WebRTC)

### Fase 4 — Hardening producción

- Fusionar patrones de `backend/src/`
- CI verde
- Auditoría API persistente
- Multi-tenant enforcement

---

## Cómo verificar avance

```bash
npm run db:verify          # esquema OK
npm run demo:clean         # demo repetible
npm run dev                # API + web
npm test                   # contratos (hoy inestable — tratar como objetivo)
```

Login demo: `admin@agrolivo.cl` / `password123`  
Flujo crítico a probar: login → `/operacion` → atender → escalar → resolver.

---

**Última actualización basada en código:** 2026-06-11  
**Rama:** `integracion/funcionalidad-escalar-ddbb_inicial`
