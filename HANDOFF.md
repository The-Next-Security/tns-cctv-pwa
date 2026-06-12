# HANDOFF — TNS CCTV PWA

> **Para:** la próxima instancia de desarrollo (agente Claude o desarrollador humano).
> **De:** sesiones del 2026-06-11/12 en la rama `claude/heuristic-yonath-8b3363`: (1) QA completo §5.2, (2) resolución de hallazgos #48–#56 (§6.R), (3) responsividad iOS de la PWA (§7).
> **Punto de partida obligatorio** de la próxima sesión. Léelo completo antes de tocar código.
> **Misión global:** hito de pruebas con NVR reales (≈2026-06-25) y go-live (≈2026-07-02).
> **🎯 Próxima sesión: ver §8** — validaciones manuales del PO (push E2E, instalar PWA, iPhone real), cierre de issues en GitHub, spike NVR físico si hay hardware.

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

### 6.R RESULTADOS — sesión de resolución 2026-06-11 (tarde)

**Verificación de cierre:** `npm test` **99/99** ✅ (4 archivos de test nuevos: +2 de contrato) · `tsc --noEmit` ✅ · `npm run build` ✅ · scan de secretos limpio · cada fix verificado en navegador 390×844 y contra la BD (vía API).

| Issue | Estado | Resumen del fix |
|---|---|---|
| #51 QA-10 | ✅ RESUELTO (pendiente cierre en GitHub) | Card de acciones unificado en `/operacion/alerta/[id]`: Atender/Revisada/Llamar/Escalar/Descartar con el patrón del card de consola (forzar `en_revision` para visibilidad). E2E verificado: timeline BD registra NEW→IN_REVIEW→CALL_REGISTERED→ESCALATING desde el detalle. |
| #50 QA-09 | ✅ RESUELTO | `resolution_notes` = `comment_text` del último CLOSED del timeline; decisión del SP expuesta aparte como `resolution_decision`. Ojo: la columna es `comment_text`, no `comment`. Test: `resolution-notes.contract.spec.js`. |
| #54 QA-13 | ✅ RESUELTO | `getResolutionLabel` + `RESOLUTION_DECISION_LABELS` en `lib/types.ts` (traduce CONFIRMED→confirmada, etc., incluso datos legacy); causa raíz adicional: `attendAlert` fosilizaba el enum como comment cuando no había nota (`notes \|\| target.decision` → `notes \|\| null`). Test: `resolution-label.contract.spec.js`. |
| #48 QA-07 | ✅ Implementado — confirmar "Instalar app" a mano | Íconos 192/512 + maskable generados desde el logo (fondo blanco) en `public/brand/icon-*.png` y declarados en `app/manifest.ts`. ⚠️ `public/` está gitignored COMPLETO: los íconos requieren `git add -f`. `beforeinstallprompt` no dispara en headless. |
| Push E2E | ⏳ Preparado — requiere PO | Claves VAPID generadas en `.env.local` (gitignored); backend `push enabled:true`. Falta el paso manual del PO (permiso de notificaciones + escalar). |
| #49 QA-08 | ⏸ Sin implementar — decisión diferida | PO aclaró (2026-06-11): los NVR no están conectados y los datos de heartbeat en BD son inventados para pruebas. La decisión "sin datos" vs "ok" se retoma con el spike de NVR físico, cuando haya heartbeats reales. |
| #52 QA-11 | ✅ RESUELTO | Leyenda del login corregida (la auth es real); accesos rápidos ya apuntaban a usuarios del seed. |
| #53 QA-12 | ✅ RESUELTO | `USUARIOS_PRUEBA.md` e `INSTRUCCIONES_ACCESO.md` reescritos desde el seed real (9 usuarios, roles reales, auth JWT+bcrypt, sesión D10). |
| #55 QA-14 | ✅ RESUELTO | Avatar: top-bar leía `full_name` pero `/auth/me` llena `nombre` → `displayName` con fallback. Popover: `collisionPadding={16}` + `max-w-[calc(100vw-2rem)]`; verificado contenido en 390px sin scroll horizontal. |
| #56 QA-15 | ✅ RESUELTO (alcance mínimo) | Callout warning "Datos de demostración" en /reportes + gráficos migrados a tokens CSS (`var(--criticality-*)`, `var(--cctv-accent-blue)`, `var(--alert-success)`). KPIs desde BD = D11 (re-agendado). |

**Commits:** 8 commits aprobados por el PO al cierre (sin push). **Cierre de issues en GitHub:** pendiente de la validación manual del PO (lista de validaciones por issue entregada en la sesión); #48 espera el check "Instalar app" y #49 quedó diferido.

### 6.6 Plan de la siguiente sesión — SUPERSEDIDO por §8 (tras la sesión de responsividad §7)

### 6.5 Reglas de la sesión

- Un issue = un goal del loop (ejecutar → verificar → cerrar con evidencia). Commits con aprobación del PO referenciando el issue (`fix: ... (#51)`).
- Mobile-first 390×844 para validar cada fix de UI; editor de reglas en desktop.
- Los 4 tests de contrato nuevos (`alert-class`, `db-timezone`, `users-rbac`, `alert-vocabulary`) NO se tocan — si fallan, el fix está mal.
- Mantener anti-objetivos §2.4. El **spike NVR físico** (§3.1) sigue siendo el bloqueante del hito 25-jun: si el hardware llega antes, ese spike tiene prioridad sobre las tandas 3 y 4.
- Al cerrar: suite verde, `LECCIONES.md` con lo no obvio, este HANDOFF actualizado (§6 marcado con resultados + plan de la siguiente sesión).

---

## 7. RESULTADOS — sesión de responsividad iOS (2026-06-11/12)

**Goal:** PWA sin desplazamiento lateral fuera de los bordes y menús/navegación perfectos; el PO reportó mal comportamiento en iOS.

**Verificación de cierre:** las 13 rutas (login, operación, detalle de alerta, recepción, expedientes, reportes, salud, admin + 6 subpáginas) con `scrollWidth` = viewport exacto en **390×844 y 375×667**, cero elementos fuera de bordes, `window.scrollTo(500,0)` no mueve la página. Menú móvil completo: abre, cubre el bottom nav, expande submenú Admin, navega, se auto-cierra. `npm test` 99/99 ✅ · `tsc` ✅ · `build` ✅.

### 7.1 Causas raíz corregidas (commit `7cdb16b`)

| Síntoma iOS | Causa raíz | Fix |
|---|---|---|
| Paneo lateral de toda la página | `sr-only` `position:absolute` del botón refresh sin ancestro posicionado → containing block = body → escapaba el clip de la fila de chips y expandía `body.scrollWidth` a 956px | `position: relative` en `.mobile-scroll-x` (`app/globals.css`) |
| `overflow-x: hidden` no bloquea el paneo táctil | Limitación conocida del root scroller en iOS Safari | `overflow-x: clip` en html/body vía `@supports` AL FINAL del layer base (el minificador colapsa fallbacks duplicados en una misma regla) |
| Topbar bajo el notch / nav bajo el home indicator (PWA instalada) | Faltaba `viewportFit: 'cover'` → `env(safe-area-inset-*)` = 0 | `viewportFit: 'cover'` en el export `viewport` (`app/layout.tsx`) |
| Pie del menú lateral fuera de pantalla con barra de URL visible | `h-screen` (100vh = viewport grande) en elemento fixed | `h-full` (en fixed, el % sigue el viewport dinámico) en `app-sidebar.tsx` |
| Menú lateral tapado por el bottom nav | Ambos z-50 y el nav va después en el DOM | Overlay del menú a z-[55]/z-[60] + botón contextual "Cerrar menú" (prop `mobile` en `AppSidebar`) |

⚠️ **Hallazgo de tooling (LECCIONES.md):** turbopack en dev no recompiló un `@apply` editado (sirvió el chunk con otros cambios del MISMO archivo pero sin ese). Verificar el chunk CSS servido, no solo el fuente; declaraciones críticas en CSS plano.

### 7.2 Pendiente de validación en dispositivo real

No hay Safari/iOS en el entorno de desarrollo (Puppeteer = Blink). Los fixes atacan los mecanismos documentados de iOS, pero la confirmación final es **en el iPhone del PO**: arrastre lateral en operación/reportes/salud, menú hamburguesa con barra de URL visible, topbar vs notch en modo instalado.

---

## 8. PLAN DE LA PRÓXIMA SESIÓN

**Estado de partida:** rama `claude/heuristic-yonath-8b3363` en `7cdb16b`, **sincronizada con `origin/feature/t_0126143d`** (mismo HEAD verificado 2026-06-12); son **25 commits sobre `dev`**, aún sin merge. Suite **99/99** en 17 archivos (6 tests de contrato intocables: `alert-class`, `db-timezone`, `users-rbac`, `alert-vocabulary`, `resolution-notes`, `resolution-label`). Issues #48–#56 **abiertos en GitHub a propósito** (el PO pidió cerrarlos solo tras su validación manual). Claves VAPID en `.env.local` (gitignored — regenerar con `npx web-push generate-vapid-keys` si se pierde). Para levantar la app con push: `set -a; source .env.local; set +a; npm run dev`.

### 8.0 Protocolo de inicio

```
1. Protocolo de lectura (CLAUDE.md global + proyecto + LECCIONES_APRENDIDAS.md + confirmación)
2. Leer este HANDOFF (§6.R, §7 y este §8) + LECCIONES.md (25 reglas)
3. git status / git log -25  → HEAD debe seguir sincronizado con origin/feature/t_0126143d; decidir merge/PR a dev con el PO
4. npm install && npm run db:verify && npm test  → debe dar 99/99 verde
5. set -a; source .env.local; set +a; npm run dev  → web :3000, api :4000 (push enabled:true)
```

### 8.1 Bloque 1 — Validaciones manuales del PO (≈20 min, desbloquea los cierres)

| Validación | Cómo | Cierra |
|---|---|---|
| Push E2E | Chrome del PO → login admin → permitir notificaciones → atender+llamar+escalar una alerta → cerrar pestaña → notificación llega → clic abre detalle → SELECT (solo lectura, protocolo BD) de `ale_notificacion` channel PUSH status SENT | Bloque F §5.2 |
| Instalar PWA | Chrome → menú ⋮ → "Instalar app" en localhost:3000 | #48 |
| iPhone real | Arrastre lateral en operación/reportes/salud; menú hamburguesa; topbar vs notch instalada | §7.2 |
| Fixes #50–#56 | Lista de validaciones por issue entregada en la sesión (resolución con/sin nota, leyenda login, avatar "C", popover 390px, aviso /reportes) | #50–#56 |

Tras validar: `gh issue close <n> --comment` con evidencia (aprobación del PO por tanda). #49 queda abierto (decisión diferida al spike NVR — los heartbeats actuales son datos inventados, dixit PO 2026-06-11).

### 8.2 Bloque 2 — Trabajo de desarrollo (en orden)

1. **Spike NVR físico** (§3.1) si el hardware llegó — bloqueante del hito 25-jun, prioridad sobre todo lo demás. Incluye decisión #49 con heartbeats reales.
2. **PR/merge de la rama a `dev`** (con aprobación): 25 commits acumulados; mientras más crezca, más caro el merge.
3. **D11 tanda 1** (mocks→seed): `GET /tenants` + zonas; KPIs de /reportes desde BD (hoy tienen aviso de demo, falta el dato real).
4. **Backlog pre-go-live §3.5** + corregir la línea `public/` de `.gitignore` (hoy obliga a `git add -f` por asset) + rotar `dev-ingest-key` y credenciales demo.

### 8.3 Reglas vigentes

- Un goal verificable por tarea; máximo 3 diagnósticos por bloqueo antes de escalar al PO.
- Mobile-first 390×844 (editor de reglas en desktop). Los 6 tests de contrato NO se tocan.
- Commits/push/cierres de issues con aprobación explícita del PO. Checklist de secretos antes de cada commit.
- Al cerrar: suite verde, LECCIONES.md con lo no obvio, este HANDOFF actualizado (§8 marcado con resultados + plan siguiente).

---

*Actualizado el 2026-06-12 al cierre de la sesión de responsividad iOS. Si este documento contradice al código, el código + la suite de tests son la verdad — y hay que corregir este documento.*
