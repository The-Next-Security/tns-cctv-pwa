# HANDOFF — TNS CCTV PWA

> **Para:** la próxima instancia de desarrollo (agente Claude o desarrollador humano).
> **De:** sesión QA 2026-06-11 (rama `claude/heuristic-yonath-8b3363`), que ejecutó completo el checklist §5.2, corrigió 4 bugs P1 con regresión y registró 9 issues en GitHub.
> **Punto de partida obligatorio** de la próxima sesión. Léelo completo antes de tocar código.
> **Misión global:** hito de pruebas con NVR reales (≈2026-06-25) y go-live (≈2026-07-02).
> **🎯 Próxima sesión: RESOLUCIÓN DE HALLAZGOS QA — issues #48–#56 + push E2E manual** (ver §6; resultados QA en §5.2).

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

### 5.2 Checklist QA — RESULTADOS (sesión QA 2026-06-11, viewport 390×844 salvo reglas)

**A. Autenticación y sesión (D10) — PASS**
- [x] Login correcto / credenciales malas ("Correo o contraseña incorrectos"). Usuario inactivo: sin usuario INACTIVE en seed; validado en código (`mysqlStore.cjs:331` → 401).
- [x] `GET /auth/me` 200 con token; 401 sin token y con token corrupto.
- [x] Refresh rotativo: nuevo refresh distinto; replay del usado → 401.
- [x] Logout limpia `tns_token` + `tns_refresh_token` (localStorage queda solo `theme`).
- [x] Menú por rol: admin ve Administración completa (incl. Configuración); vigilante solo "Alertas".

**B. Flujo crítico de alertas — PASS (2 bugs P1 detectados y corregidos)**
- [x] Ingest curl → 202 RECEIVED, match Regla-0004, popup en `/operacion` <10 s vía WS.
- [x] Cadena completa atender→llamar→escalar (checklist+observación)→resolver verificada en `log_evento_timeline` (NEW→IN_REVIEW; CALL_REGISTERED; NEW→ESCALATING; ESCALATING→CLOSED/CONFIRMED).
- [x] Descartar con motivo (Falso positivo – vegetación); reactivar → vuelve a pendiente y exige nueva llamada antes de escalar.
- [x] `action:'revisada'`/'escalada' → 400 VALIDATION_ERROR con enum canónico.
- [x] `/operacion/alerta/[id]` carga desde API.
- 🐛 **QA-03 (Alta, CORREGIDO):** `getAlertClass` degradaba `alta` a "Baja prioridad" contra PRD §5.3 → contador de críticas y popup mal. Fix en `lib/types.ts` + `tests/alert-class.contract.spec.js`.
- 🐛 **QA-04 (Alta, CORREGIDO):** timestamps mezclados local/UTC en BD (timeline cronológicamente corrupto, "hace 4 horas" en alertas de minutos). Fix: `SET time_zone='+00:00'` por conexión en `db/lib/pool.cjs` + `tests/db-timezone.contract.spec.js`. Datos previos al fix quedan mezclados (solo dev).

**C. Seguridad — PASS (1 bug Alta detectado y corregido)**
- [x] events/alerts/users/rules/vehicle-entries sin token → 401.
- [x] Ingest sin/mala API key → 401; JWT como reemplazo → 401.
- [x] WS sin frame auth → 4401 AUTH_TIMEOUT a los 5.0 s; token inválido → 4401 INVALID_TOKEN inmediato; token en query string ignorado (4401). Control positivo: auth.ack OK.
- 🐛 **QA-05 (Alta, CORREGIDO):** sin RBAC de servidor — un vigilante podía POST/PATCH /users (crear un admin). Fix: `requireRole('admin_parque')` en mutaciones de users (`src/auth.js` + `src/app.js`) + `tests/users-rbac.contract.spec.js`. GET /users queda abierto a autenticados (alimenta contactos de escalación).

**D. Recepción vehicular — PASS**
- [x] Listado desde BD; validación inline de campos requeridos; crear ingreso persiste (`adm_ingreso`, conductor/RUT/empresa/tipo OK); salida persiste `exit_at`.
- [x] Backend caído → toast "Sin conexión con el servidor — mostrando datos de demostración".

**E. Salud M6 — PASS (1 bug Alta corregido)**
- [x] Heartbeat curl (`POST /ingest/heartbeat`, body `{source_id, status}`) actualiza `last_check`; los 3 estados observados en vivo: ok (recién reportado) → degraded (>5 min) → down (>15 min), umbrales leídos de `gen_configuracion_*`.
- 🐛 **QA-06 (Alta, CORREGIDO):** `/salud` pintaba NVRs hardcodeados (3 NVRs falsos, "hace 2 segundos", CPU/memoria inventadas) aunque llamaba al API. Fix: la sección consume `/health/nvrs` real con fallback a mock + toast; métricas de hardware se omiten hasta que el API las exponga.
- ⚠️ Decisión PO pendiente: fuente sin heartbeat jamás (`last_heartbeat_at NULL`) se muestra "ok" (NVR-Secundario, 30 h sin señal). Propuesta: estado "sin datos".

**F. Push (D9) — PARCIAL (limitación del entorno)**
- [x] Claves VAPID generadas; backend `push enabled:true`; `sw.js` activo con handlers; degradación elegante sin permiso ("push bloqueadas — la escalación se registrará igualmente"); tests unitarios del servicio verdes.
- [ ] **PENDIENTE manual:** E2E notificación con app cerrada + clic abre detalle + fila `ale_notificacion` SENT. El perfil Chrome automatizado tiene las notificaciones denegadas y no se puede otorgar por script. Ejecutar a mano: definir VAPID en el entorno, permitir notificaciones en el navegador, escalar una alerta.

**G. PWA mobile — PASS con 1 hallazgo**
- [x] `sw.js` registra sin errores de consola; todas las vistas usables en 390×844 (operación, recepción, expedientes+detalle, reportes, salud, admin, login); editor de reglas correcto en desktop.
- 🐛 **QA-07 (Media, ABIERTO):** los íconos del manifest son 800×250 (logo); Chrome exige 192×192 y 512×512 cuadrados para instalación → la PWA NO es instalable. Requiere assets de diseño.

### 5.2b Issue log Media/Baja — REGISTRADOS EN GITHUB (2026-06-11)

- **QA-07 (Media) → [#48](https://github.com/The-Next-Security/tns-cctv-pwa/issues/48):** manifest sin íconos cuadrados 192/512 → PWA no instalable.
- **QA-08 (Media) → [#49](https://github.com/The-Next-Security/tns-cctv-pwa/issues/49):** `/salud` NVR sin heartbeat se muestra "ok" — falta estado "sin datos" (decisión PO).
- **QA-09 (Media) → [#50](https://github.com/The-Next-Security/tns-cctv-pwa/issues/50):** `alerts.resolution_notes` devuelve la decisión (`CONFIRMED`) en lugar de la nota escrita; la nota vive solo en el timeline.
- **QA-10 (Media) → [#51](https://github.com/The-Next-Security/tns-cctv-pwa/issues/51):** detalle de alerta sin acciones Llamar/Escalar — quien llega por deep-link/push no puede escalar desde ahí.
- **QA-11 (Baja) → [#52](https://github.com/The-Next-Security/tns-cctv-pwa/issues/52):** login dice "Modo demo — cualquier contraseña funciona" pero el backend ya valida credenciales reales.
- **QA-12 (Baja) → [#53](https://github.com/The-Next-Security/tns-cctv-pwa/issues/53):** `USUARIOS_PRUEBA.md` desactualizado respecto del seed real (también `INSTRUCCIONES_ACCESO.md`).
- **QA-13 (Baja) → [#54](https://github.com/The-Next-Security/tns-cctv-pwa/issues/54):** tarjetas resueltas muestran "Resuelta: CONFIRMED" (enum crudo en inglés).
- **QA-14 (Baja) → [#55](https://github.com/The-Next-Security/tns-cctv-pwa/issues/55):** avatar "U" genérica en mobile; popover de contactos desborda el viewport 390 px.
- **QA-15 (Baja) → [#56](https://github.com/The-Next-Security/tns-cctv-pwa/issues/56):** /reportes con datos mock sin aviso y colores raw fuera del design system (ligado a D11).

### 5.3 Cierre de la sesión QA 2026-06-11 — CUMPLIDO

- Checklist §5.2 ejecutado completo con evidencia (outputs curl + capturas + verificación BD vía API).
- 4 bugs P1/Alta corregidos en sesión con test de regresión: QA-03, QA-04, QA-05, QA-06.
- Verificación final: `npm test` **90/90** ✅ · `tsc --noEmit` ✅ · `npm run build` ✅ · scan de secretos limpio.
- `LECCIONES.md` actualizado (5 reglas nuevas).

---

## 6. PLAN DE LA PRÓXIMA SESIÓN: RESOLUCIÓN DE HALLAZGOS QA

**Goal verificable de la sesión:** issues [#48](https://github.com/The-Next-Security/tns-cctv-pwa/issues/48)–[#56](https://github.com/The-Next-Security/tns-cctv-pwa/issues/56) cerrados (o re-priorizados con el PO), push E2E validado a mano, suite verde, y cada issue cerrado con evidencia en el comentario de cierre (`gh issue close <n> --comment`).

### 6.0 Protocolo de inicio (igual que siempre + específico)

```
1. Protocolo de lectura (CLAUDE.md global + proyecto + LECCIONES_APRENDIDAS.md + confirmación)
2. Leer este HANDOFF (§5.2 resultados QA y este §6) + LECCIONES.md
3. git status / git log -10  → la rama qa dejó 7 commits sin push (f26420d..)
4. cp db/connection-config.json del repo principal si el worktree no lo tiene
5. npm install && npm run db:verify && npm test  → debe dar 90/90 verde
6. gh issue list --state open  → confirmar el estado real de #48–#56
7. npm run dev (web :3000, api :4000, STORE=mysql)
```

### 6.1 Tanda 1 — Flujo de alertas (Media, juntos porque comparten archivos)

| Issue | Qué hacer | Criterio de cierre |
|---|---|---|
| [#51](https://github.com/The-Next-Security/tns-cctv-pwa/issues/51) QA-10 | Agregar Llamar/Escalar al detalle `/operacion/alerta/[id]` reutilizando `CallContactsPopover` + `EscalateButton` de `components/operacion/escalation-controls.tsx` | Desde el detalle de una alerta escalable se completa llamar→escalar; timeline en BD lo refleja |
| [#50](https://github.com/The-Next-Security/tns-cctv-pwa/issues/50) QA-09 | `resolution_notes` debe devolver la nota del operador (comment del último CLOSED del timeline), no la decisión | GET /alerts/:id muestra la nota escrita; test de contrato |
| [#54](https://github.com/The-Next-Security/tns-cctv-pwa/issues/54) QA-13 | Traducir decisión en tarjetas resueltas (depende de #50) | Pestaña Resueltas sin enums en inglés |

### 6.2 Tanda 2 — PWA y push (cierra el bloque F pendiente)

| Issue | Qué hacer | Criterio de cierre |
|---|---|---|
| [#48](https://github.com/The-Next-Security/tns-cctv-pwa/issues/48) QA-07 | Generar íconos 192×192 y 512×512 (+maskable) desde el logo TNS y declararlos en el manifest | Chrome ofrece "Instalar app"; Lighthouse PWA installable |
| Push E2E (§5.2 F) | Con claves VAPID en el entorno y permiso de notificaciones otorgado A MANO en el navegador del PO: escalar alerta → notificación con app cerrada → clic abre `/operacion/alerta/[id]` → fila `ale_notificacion` channel PUSH status SENT | Evidencia (captura + SELECT) en el HANDOFF |

⚠️ El permiso de notificaciones NO se puede otorgar por script — este paso necesita interacción manual del PO en su Chrome.

### 6.3 Tanda 3 — Salud y coherencia demo (requiere 1 decisión del PO)

| Issue | Qué hacer | Criterio de cierre |
|---|---|---|
| [#49](https://github.com/The-Next-Security/tns-cctv-pwa/issues/49) QA-08 | **Preguntar primero al PO:** ¿estado "sin datos" para fuentes sin heartbeat? Si sí: agregar `unknown` a `NvrHealthStatus`, badge gris en /salud | NVR-Secundario deja de mostrarse "ok" sin haber reportado jamás |
| [#52](https://github.com/The-Next-Security/tns-cctv-pwa/issues/52) QA-11 | Corregir leyenda y accesos rápidos del login al modelo de auth real | Login sin textos falsos |
| [#53](https://github.com/The-Next-Security/tns-cctv-pwa/issues/53) QA-12 | Reescribir `USUARIOS_PRUEBA.md` + `INSTRUCCIONES_ACCESO.md` desde el seed real | Docs alineados a `07_01_datos_iniciales.sql` |

### 6.4 Tanda 4 — UI mobile y D11 (si queda tiempo; si no, re-agendar)

| Issue | Qué hacer | Criterio de cierre |
|---|---|---|
| [#55](https://github.com/The-Next-Security/tns-cctv-pwa/issues/55) QA-14 | Inicial real en avatar; `collisionPadding`/max-width al popover de contactos | Sin scroll horizontal en 390×844 |
| [#56](https://github.com/The-Next-Security/tns-cctv-pwa/issues/56) QA-15 | Mínimo: aviso "datos de demostración" en /reportes; ideal: tanda 1 de D11 (KPIs desde BD) + tokens ds-* en gráficos | Sin mock silencioso (D6) |

### 6.5 Reglas de la sesión

- Un issue = un goal del loop (ejecutar → verificar → cerrar con evidencia). Commits con aprobación del PO referenciando el issue (`fix: ... (#51)`).
- Mobile-first 390×844 para validar cada fix de UI; editor de reglas en desktop.
- Los 4 tests de contrato nuevos (`alert-class`, `db-timezone`, `users-rbac`, `alert-vocabulary`) NO se tocan — si fallan, el fix está mal.
- Mantener anti-objetivos §2.4. El **spike NVR físico** (§3.1) sigue siendo el bloqueante del hito 25-jun: si el hardware llega antes, ese spike tiene prioridad sobre las tandas 3 y 4.
- Al cerrar: suite verde, `LECCIONES.md` con lo no obvio, este HANDOFF actualizado (§6 marcado con resultados + plan de la siguiente sesión).

---

*Actualizado el 2026-06-11 al cierre de la sesión QA. Si este documento contradice al código, el código + la suite de tests son la verdad — y hay que corregir este documento.*
