# HANDOFF — TNS CCTV PWA

> **Para:** la próxima instancia de desarrollo (agente Claude o desarrollador humano).
> **De:** sesión de codificación 2026-06-11 (rama `claude/heuristic-yonath-8b3363`), que ejecutó el plan de la revisión de arquitectura aplicando Loop Engineering.
> **Punto de partida obligatorio** de la próxima sesión. Léelo completo antes de tocar código.
> **Misión global:** hito de pruebas con NVR reales (≈2026-06-25) y go-live (≈2026-07-02).
> **🎯 Próxima sesión: TESTING TIPO QA de la aplicación** (ver §5).

---

## 0. Orden de lectura al iniciar la sesión

1. **Este documento** (estado real + método + plan QA).
2. `LECCIONES.md` — reglas destiladas de la sesión de código (formato RULE).
3. `PRD-PRODUCTO.md` + `ARCHITECTURE.md` (02-design/) — diseño de referencia.
4. Según la tarea: `API.md`, `DATA-MODEL.md`, `DATABASE-SPEC.md` (37 tablas), `SECURITY.md`.
5. Para el conector NVR: `connector/README.md` + `01-prd/HTTP_API_3.26_DAHUA.md`.

⚠️ **Hallazgo de la sesión 2026-06-11:** `PRD-V2.md` y `REVISION-ARQUITECTO.md` se citaban como documentos maestros pero **no existen en el repo**. La precedencia efectiva es: este HANDOFF > LECCIONES.md > docs de `02-design/`. Las decisiones D1–D11 quedan registradas en §2 de este documento.

---

## 1. Metodología validada: Loop Engineering

Basada en "How To Build AI Agents That Work While You Sleep (Using Claude Fable)". **Se aplicó completa en la sesión 2026-06-11 y funcionó** — mantenerla.

### 1.1 El loop (sin cambios)

```
GOAL (testeable) → ATTEMPT (cambio acotado) → FEEDBACK (tests/errores reales)
→ SELF-CORRECT (diagnóstico antes de reintentar) → VERIFY (suite completa + E2E)
→ PASS → siguiente | FAIL → ATTEMPT con el gap identificado
```

### 1.2 Qué funcionó en la práctica (evidencia de la sesión)

1. **Verificador antes que features (Paso 0) pagó de inmediato.** La suite pasó de 15 a 76 tests; cada bloque cerró con suite verde + `tsc --noEmit` + `db:verify`, lo que permitió detectar regresiones en minutos (ej.: el parser multipart fallaba SOLO con chunks de 1 byte — un test parametrizado `test.each([1,3,7,16])` lo atrapó; sin él habría llegado roto al hardware).
2. **Diagnóstico antes de reintento evitó iteración ciega.** Dos casos reales: (a) el test de timeout WS fallaba porque `WS_AUTH_TIMEOUT_MS` se leía al cargar el módulo y no dentro de la factory — leído el error, una hipótesis, un fix; (b) el bug `RAW_NVR` del enum se diagnosticó leyendo el mensaje SQL exacto, no probando variantes.
3. **Tests de contrato como guardia permanente.** `tests/alert-vocabulary.contract.spec.js` falla si el vocabulario legacy reaparece — el "no volverá a pasar" quedó ejecutable, no prometido.
4. **Verificación E2E separada del trabajo.** El smoke test final contra MySQL real (login → ingest con API key → match de regla → alerta creada → heartbeat → salud) encontró 3 problemas que la suite unitaria no veía: seed sin conector edge, fuente identificada solo por CHAR(26), y el enum sin `RAW_NVR`. **Regla: la suite verde NO sustituye el flujo E2E con BD real.**
5. **Routing de esfuerzo:** las tareas mecánicas (parser contra fixtures, CRUD) avanzaron en lote; el juicio se gastó en seguridad, SP y diagnósticos.
6. **Outer loop:** todo lo no obvio quedó en `LECCIONES.md` (8 reglas). Leerlo evita re-derivar.

### 1.3 Reglas operativas (vigentes)

- Ningún goal sin criterio verificable escrito antes de empezar.
- Máximo 3 diagnósticos distintos por bloqueo antes de escalar al PO (Felipe).
- Al cerrar sesión: repo verde, commits descriptivos, LECCIONES.md actualizado, este HANDOFF actualizado si cambió el alcance.

---

## 2. ESTADO REAL DEL CÓDIGO (al cierre 2026-06-11)

**Verificación de cierre:** `npm test` 76/76 ✅ (repetible) · `tsc --noEmit` ✅ · `npm run build` ✅ · `npm run db:verify` ✅ (37 tablas) · E2E manual contra MySQL ✅.

**Rama:** `claude/heuristic-yonath-8b3363` — 7 commits sobre `dev` (`6ac0fe5..b15da5b`), sin push.

### 2.1 Completado esta sesión (por decisión)

| Decisión | Estado | Dónde |
|---|---|---|
| D1 archivar `backend/src/` | ✅ | `docs/poc-security/` (no fusionar; patrones ya portados) |
| D2 vocabulario único `attendEvent` | ✅ | `lib/api.ts`, consumidores migrados; acciones canónicas: `acknowledge·resolve·escalate·discard·reactivate·activate·register_call`; test de contrato vigila |
| D3 UX optimista + reconciliación | ✅ | Cero `.catch(() => {})`; toast + resincronización; BD = fuente de verdad |
| D4 llamada = timeline | ✅ | Acción `register_call` → `CALL_REGISTERED` en `log_evento_timeline`; `llamada_at` se deriva por subconsulta (no es columna) |
| D7 fail-fast secretos | ✅ | `src/config.js`: sin `JWT_SECRET` en producción no arranca; ídem `INGEST_API_KEY` si el store no valida por BD |
| Paso 2 seguridad completa | ✅ | JWT en todo el API salvo `/auth/login`, `/auth/refresh`, `/health/*` (`src/auth.js`); ingest con `x-api-key` (SHA-256 vs `src_conector_edge.api_key_hash`); WS: frame `auth` primero, timeout 5 s, cierre 4401, sin token en query string |
| D8 conector edge Dahua | ✅ código / ⏳ hardware | `connector/` completo (parser multipart streaming, Digest RFC 7616, mapper, idempotencia, backoff). Falta SOLO el spike contra NVR físico para grabar golden files |
| D10 sesión 60 min/10 h | ✅ | `/auth/me` + `/auth/refresh` rotativo (un solo uso, tope absoluto 10 h); AuthProvider renueva cada 50 min |
| M6 salud | ✅ | Heartbeat por fuente (`POST /ingest/heartbeat` + señal implícita del ingest); umbrales en `gen_configuracion_*`: degradado >5 min, incidente >15 min (configurable) |
| D9 push mínimo | ✅ código / ⏳ claves | Web Push VAPID: `public/sw.js`, suscripciones (`ale_push_suscripcion`), envío a roles al escalar, registro en `ale_notificacion` canal `PUSH`. **Faltan claves VAPID en el entorno** |
| `GET /alerts/:id` | ✅ | Repara `/operacion/alerta/[id]` |

### 2.2 Migraciones de BD — TODAS APLICADAS en la BD local del PO (2026-06-11)

`08_08` api_key_hash · `08_09` salud M6 · `08_10` push · `08_11` seed conector edge · `08_12` enum RAW_NVR. Todas reflejadas también en `01_CreacionDesdeCero/` para instalaciones desde cero. Además se restauró `gen_usuario.rol='admin_parque'` para `admin@agrolivo.cl` (se había alterado en pruebas de CRUD; el menú filtra por rol).

### 2.3 Contratos clave que QA debe conocer

- **Ingest:** `POST /api/v1/ingest/events` exige `x-api-key` (dev: `dev-ingest-key`) + `x-idempotency-key`. `source.source_id` acepta `id_fuente` CHAR(26) **o** `source_code` (`nvr-principal`/`nvr-secundario`). Respuestas: 202 `RECEIVED` (matcheó regla → alerta), 202 `STORED_RAW` (sin regla), 400 `UNKNOWN_SOURCE`, 409 conflicto idempotencia, 401 sin/mala API key.
- **Auth:** login demo `admin@agrolivo.cl` / `password123` (rotar antes de go-live). Access 60 min; refresh rotativo (reusar un refresh token usado → 401). Sesiones de refresh viven en memoria: **reiniciar el backend invalida los refresh** (re-login).
- **WS:** primer frame `{type:'auth',data:{token}}` → `auth.ack` → recién entonces `subscribe.filters`. Sin auth en 5 s → cierre 4401.
- **Estados de alerta:** SOLO vía SP `stpr_register_event_state`. UI: pendiente→en_revision→(escalada)→resuelta/descartada, con `reactivate` desde cerrada y `register_call` sin cambio de estado.
- **Entorno local:** el worktree necesita `db/connection-config.json` (gitignored — copiarlo del repo principal).

### 2.4 Anti-objetivos (sin cambios)

No multi-tenant enforcement · no streaming en vivo · no ORM · no rehacer UI/design system · no correlación S1/S2 · CRUD de reglas UI fuera del go-live.

---

## 3. Pendientes (backlog ordenado)

1. **Spike NVR físico (1 día, antes del 25-jun):** validar los 3 endpoints contra firmware real, **grabar golden files** que reemplacen los fixtures sintéticos de `tests/connector.*.spec.js`, registrar desviaciones firmware-vs-spec en LECCIONES.md. Endpoint de estado de cámaras (`attachCameraState`) aún no implementado.
2. **Claves VAPID:** `npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` en el entorno. Sin ellas el push queda deshabilitado (el backend lo loggea y no se cae).
3. **D11 migración mocks→seed:** no iniciada. Tanda 1: `GET /tenants` desde `gen_tenant` + zonas. `MOCK_VEHICLE_ENTRIES` aún es fallback visible (toast "datos de demostración") en `/recepcion`.
4. **Snapshots reales:** hoy el conector persiste JPEG a disco con URI `file://`; falta integrar `dah_snapshot` + `ale_evidencia` y reemplazar `demo-media.ts`.
5. **Antes del go-live:** rotar `dev-ingest-key` (08_08/08_11), rotar credenciales demo, actualizar `INSTRUCCIONES_ACCESO.md` (describe auth mock obsoleta), revisar `public/` gitignored (assets sin versionar; `sw.js` ya se forzó), modernizar `VALUES()`→alias en seeds (deprecado MySQL 9, solo warnings).

---

## 4. Protocolo de inicio de la próxima sesión

```
1. Leer HANDOFF.md (este) + LECCIONES.md
2. git status / git log -10        → estado real (¿se pusheó/mergeó la rama?)
3. cp del repo principal db/connection-config.json si el worktree no lo tiene
4. npm install && npm run db:verify && npm test   → debe dar 76/76 verde
5. npm run dev                     → :3000 web, :4000 api (STORE=mysql)
6. Ejecutar el plan QA de §5 en orden
```

---

## 5. PLAN DE LA PRÓXIMA SESIÓN: QA / TESTING DE LA APLICACIÓN

**Goal verificable de la sesión:** checklist §5.2 completo con evidencia (capturas/outputs), bugs registrados como issues de GitHub (`gh issue create`), y los bugs P1 corregidos con su test de regresión.

### 5.1 Método

- Cada caso QA = un goal del loop: ejecutar → registrar resultado real → si falla, diagnosticar y decidir (fix inmediato si P1, issue si P2/P3).
- Probar **mobile-first** (viewport smartphone) en todas las vistas excepto el editor de reglas (desktop) — regla de oro del producto.
- Backend con `STORE=mysql`; usar usuarios demo de `USUARIOS_PRUEBA.md` para probar permisos por rol.

### 5.2 Checklist QA (flujos verticales)

**A. Autenticación y sesión (D10)**
- [ ] Login correcto / credenciales malas / usuario inactivo.
- [ ] `GET /auth/me` con token válido; 401 con token expirado o ausente.
- [ ] Refresh rotativo: el token usado queda inválido (replay → 401).
- [ ] Logout limpia `tns_token` + `tns_refresh_token`.
- [ ] Menú por rol: admin_parque ve Administración/Configuración; vigilante no.

**B. Flujo crítico de alertas (referencia del checklist 25-jun)**
- [ ] Ingest evento (curl con `x-api-key`) → popup en `/operacion` vía WS en <10 s.
- [ ] login → atender (`acknowledge`) → llamar (`register_call`, verificar `CALL_REGISTERED` en timeline) → escalar (checklist + observación) → resolver → verificar cadena completa en `log_evento_timeline`.
- [ ] Descartar con motivo; reactivar alerta cerrada (vuelve a NEW).
- [ ] Vocabulario legacy rechazado: POST attend con `action:'revisada'` → 400.
- [ ] Detalle `/operacion/alerta/[id]` carga desde API (no mock).

**C. Seguridad (no negociable)**
- [ ] Toda ruta del API sin token → 401 (events, alerts, users, rules, vehicle-entries).
- [ ] Ingest sin/mala API key → 401; JWT NO sirve como reemplazo en ingest.
- [ ] WS sin frame auth → cierre 4401 en ~5 s; token inválido → 4401.
- [ ] Token en query string del WS: confirmar que NO se acepta.

**D. Recepción vehicular**
- [ ] Listado carga desde BD; crear ingreso persiste; registrar salida persiste (`exit_at`).
- [ ] Caída del backend: aparece toast "datos de demostración" (mock visible, no silencioso).

**E. Salud M6**
- [ ] `/salud` muestra NVRs con estado real; heartbeat por curl actualiza `last_check`.
- [ ] Simular silencio: sin heartbeat >5 min → degraded; >15 min → down (umbral configurable en `gen_configuracion_*`).

**F. Push (D9) — requiere claves VAPID**
- [ ] Generar claves, levantar backend, otorgar permiso de notificaciones, escalar una alerta → notificación push con app cerrada; clic abre `/operacion/alerta/[id]`.
- [ ] Verificar registro en `ale_notificacion` (channel PUSH, status SENT).

**G. PWA mobile**
- [ ] `sw.js` registra sin error; manifest válido; instalable.
- [ ] Todas las vistas usables en viewport 390×844 (excepto editor de reglas).

### 5.3 Al cerrar la sesión QA

- Resultados del checklist documentados (este archivo §5.2 marcado o issue por fallo).
- Bugs P1 corregidos con test de regresión; suite verde.
- `LECCIONES.md` actualizado con toda lección no obvia.
- Actualizar este HANDOFF: §2 con cambios, §5 con resultados, y definir la sesión siguiente.

---

*Actualizado el 2026-06-11 al cierre de la sesión de codificación. Si este documento contradice al código, el código + la suite de tests son la verdad — y hay que corregir este documento.*
