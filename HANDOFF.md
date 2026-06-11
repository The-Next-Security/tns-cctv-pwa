# HANDOFF — Sesión de codificación TNS CCTV PWA

> **Para:** la próxima instancia de desarrollo (agente Claude o desarrollador humano).
> **De:** sesión de revisión de arquitectura y planificación, 2026-06-11.
> **Contexto:** este documento vive en el repo junto a la documentación. Es el **punto de partida obligatorio** de la sesión de codificación. Léelo completo antes de tocar código.
> **Misión global:** llevar el software al hito de pruebas con NVR reales (≈2026-06-25) y al go-live (≈2026-07-02) según `PRD-V2.md`.

---

## 0. Orden de lectura al iniciar la sesión

1. **Este documento** (método + pasos + contexto crítico).
2. `PRD-V2.md` — documento maestro: alcance, plan de 3 semanas, decisiones D1–D11, checklists de "done" por hito.
3. `REVISION-ARQUITECTO.md` — fundamentos de las decisiones (por qué, no solo qué).
4. `PRD-PRODUCTO.md` + `ARCHITECTURE.md` — estado real del código al 2026-06-11.
5. Según la tarea: `API.md`, `DATA-MODEL.md`, `DATABASE-SPEC.md`, `SECURITY.md`, `STREAMING.md`.
6. Para el conector NVR: `HTTP_API_3.26_DAHUA.md` (spec oficial; secciones clave ya extraídas en `PRD-V2.md` §3.1).

**Precedencia ante conflicto:** `PRD-V2.md` > `REVISION-ARQUITECTO.md` > `SPRINT-PLAN.md` (obsoleto como plan) > resto. `PRD_Original.md` sigue siendo la visión de negocio (MoSCoW, KPIs).

---

## 1. Metodología de trabajo (obligatoria): Loop Engineering

Basada en "How To Build AI Agents That Work While You Sleep (Using Claude Fable)". No es referencia opcional — es el método de ejecución de esta sesión.

### 1.1 El loop

```
GOAL (claro, testeable — checklist o test, nunca "mejorar X")
  ↓
ATTEMPT (cambio de código acotado)
  ↓
FEEDBACK (tests, error de API, fixture que no parsea — feedback REAL, no opinión)
  ↓
SELF-CORRECT (diagnosticar antes de reintentar; prohibido repetir el mismo fix dos veces)
  ↓
VERIFY (verificación separada del trabajo: correr la suite completa, el checklist del hito,
        o el flujo manual E2E — no autocomplacencia de "se ve bien")
  ↓
PASS → siguiente tarea | FAIL → volver a ATTEMPT con el gap identificado
```

### 1.2 Reglas del método aplicadas a este proyecto

1. **Ningún goal sin criterio verificable.** Antes de empezar una tarea, escribe cómo sabrás que está terminada (test que pasa, item del checklist §6 del PRD-V2, flujo manual reproducible). Si no puedes escribirlo, la tarea está mal definida — descomponla.
2. **El verificador es externo al trabajo.** "Terminé" lo declara la suite de tests + el checklist, no la sensación de avance. Para cambios de riesgo (auth, SP, conector), verificar en contexto limpio: correr `npm test` completo desde cero, no solo el test del módulo tocado.
3. **Diagnóstico antes de reintento.** Si un fix falla, la siguiente acción es leer el error y formular hipótesis — no variar el código al azar.
4. **Memoria entre sesiones (outer loop):** toda lección no obvia se destila como REGLA en `LECCIONES.md` (crearlo en la primera sesión si no existe). Formato: `RULE: [principio general aplicable]`, no notas del caso puntual. Leer `LECCIONES.md` al inicio de cada sesión. Ejemplos del tipo de cosa que va ahí: desviaciones del firmware Dahua vs spec, workarounds del parser multipart, comportamientos raros de MySQL 9 / Express 5 / Next 16.
5. **Routing de esfuerzo:** las decisiones de diseño y diagnósticos duros merecen máxima atención; las tareas mecánicas con feedback automático (parser contra fixtures, migración mocks→seed, CRUD de tanda) son delegables a sub-agentes o ejecutables en lote. No gastar juicio en labor ni labor en juicio.
6. **Stop condition por tarea:** máximo de intentos antes de escalar al PO (Felipe) — si tras 3 diagnósticos distintos una tarea del camino crítico no avanza, se reporta con hipótesis y alternativas, no se insiste en silencio.

---

## 2. Los 6 pasos de ejecución (en orden — no saltarse ninguno)

### Paso 0 — Construir el verificador antes que las features

**Goal verificable:** `npm test` corre verde y es repetible dos veces seguidas desde cero.

- Resolver la inestabilidad de la suite (mezcla CJS/ESM, dependencias). Ver `SPRINT-PLAN.md` §Tests CI.
- Esto es prerrequisito de TODO lo demás. Sin suite verde, los refactors de los pasos 1–2 son apuestas a ciegas.
- Mientras estés aquí: `npm run db:verify` debe pasar también (36 tablas, SP, evento).

### Paso 1 — Reducir la superficie antes de ampliarla

**Goal verificable:** un solo backend, un solo vocabulario de alertas, cero errores silenciados; suite verde tras cada cambio.

- Archivar `backend/src/` → `docs/poc-security/` (decisión D1 — NO fusionar; sus patrones se portan después como tickets).
- Vocabulario único `attendEvent` con acciones canónicas; eliminar `alerts.attend()` y alias legacy (`revisada`/`descartada`/`escalada`) — migrar `EscalateSheet` (D2). Agregar test de contrato que falle si reaparece el vocabulario viejo.
- Eliminar todos los `.catch(() => {})`: toast de error + reconciliación con la respuesta del servidor (D3). La BD es la fuente de verdad del estado de la alerta.
- `GET /alerts/:id` (falta el handler; `listAlerts` ya mapea la fila) — repara `/operacion/alerta/[id]`.
- Fail-fast de secretos: en producción sin `JWT_SECRET`, el proceso no arranca (D7).

### Paso 2 — Cerrar la seguridad (no negociable, va ANTES que el conector)

**Goal verificable:** items de seguridad del checklist hito 25-jun (PRD-V2 §6): API inaccesible sin JWT válido; ingest inaccesible sin API key; WS rechaza conexión sin auth.

- Middleware JWT en toda ruta excepto `/auth/login` y `/health/*`. Poblar `req.user` real (eliminar actor hardcoded `usr_01`).
- API key máquina-a-máquina en `POST /ingest/events` (header `x-api-key` contra `src_conector_edge`).
- Auth WebSocket: frame `auth` como primer mensaje, timeout 5 s, desconectar si no autentica. NO token en query string (queda en logs).
- Orden importa: el conector (Paso 3) consumirá el ingest YA autenticado — al revés es retrabajo.

### Paso 3 — Conector NVR con el patrón del loop aplicado literalmente

**Goal verificable:** evento generado en NVR físico aparece como alerta en `/operacion` en <10 s con snapshot real (checklist hito 25-jun).

- **Spike de validación (1 día, contra hardware real):** validar los 3 endpoints de la spec contra el firmware de los NVR del parque y **grabar streams crudos como fixtures** (golden files). Endpoints confirmados en spec V3.26 (detalle y secciones en `PRD-V2.md` §3.1):
  - `GET /cgi-bin/snapManager.cgi?action=attachFileProc&channel=-1&heartbeat=5&Flags[0]=Event&Events=[...]` — eventos + snapshot JPEG en un solo stream multipart (vía principal; incluye ANPR `TrafficJunction` → `TrafficCar.PlateNumber`).
  - `GET /cgi-bin/eventManager.cgi?action=attach&codes=[...]&heartbeat=5` — fallback eventos sin snapshot.
  - `POST /cgi-bin/api/LogicDeviceManager/attachCameraState` — online/offline de cámaras (alimenta M6).
  - Auth: HTTP **Digest RFC 7616** (401 → calcular → reintentar).
  - Ojo: requests usan canal desde 1, respuestas desde 0 (spec §3.5.1) — normalizar en un solo punto.
- **Desarrollo en loop cerrado contra fixtures:** el parser multipart/x-mixed-replace (streaming, chunks parciales, JPEG binario intercalado) se desarrolla con tests contra los golden files — sin depender del hardware en cada iteración. Este es el grueso del esfuerzo y la tarea ideal para iterar en loop.
- Conector = proceso Node independiente (`connector/`), stateless, reconexión con backoff, `mapping.json` para código Dahua → `event_type` ingest, idempotency-key = hash(nvr_id, channel, code, PTS). Credenciales NVR en config local gitignored.
- Snapshots → `dah_snapshot` + `ale_evidencia`; reemplazar `demo-media.ts` por resolución real.

### Paso 4 — Flujos verticales, no capas

**Goal verificable:** cada PR/bloque de trabajo completa un flujo E2E del checklist, nunca "avancé el backend de X".

- Flujo crítico de referencia: login → `/operacion` → atender → llamar (timeline `CALL_REGISTERED`) → escalar → resolver → verificar en `log_evento_timeline`.
- Resto de los Must en vertical: sesión 8 h (`/auth/me` + refresh rotativo 60 min/10 h, D10) → `CALL_REGISTERED` en SP+timeline (D4: NO columna) → M6 salud (heartbeat ≤5 min, incidente a >15 min, umbral en `gen_configuracion_*`) → push real (service worker + VAPID, registro en `ale_notificacion`, D9).
- El checklist §6 del PRD-V2 es el definition of done de cada PR, no una verificación de última hora.

### Paso 5 — Routing de tareas (si se trabaja con sub-agentes o en paralelo)

| Trabajo | Quién / cómo |
|---|---|
| Diseño del conector, diagnóstico de bugs duros, cambios en SP, revisión de seguridad | Atención principal, contexto completo, sin delegar |
| Parser multipart contra fixtures, migración mocks→seed (D11), endpoints CRUD de tanda, tests unitarios | Delegable: goal testeable + feedback automático + bajo riesgo |
| Pruebas en terreno (semana 3), calibración de reglas por zona/horario | Solo humanos — feedback físico |

- Migración mocks→seed (D11): los datos inventados se mudan del código frontend (`MOCK_TENANTS`, `MOCK_RULES`, `mock-case-files-api.ts`...) al seed SQL (`07_DatosIniciales` + migraciones en `08_Migraciones/`) y se exponen por API. Tanda 1: `GET /tenants` desde `gen_tenant`, zonas. Badge DEMO solo como estado transitorio de módulos aún no conectados.

### Paso 6 — Outer loop: memoria del proyecto

**Goal verificable:** al cierre de cada sesión, `LECCIONES.md` actualizado y, si cambió el alcance o una decisión, `PRD-V2.md` actualizado.

- Crear `LECCIONES.md` en la primera sesión de código (formato §1.2.4 de este handoff).
- Toda desviación firmware-vs-spec del Dahua se registra ahí Y en `PRD-V2.md` §3.3 si cambia el diseño.
- Al cerrar sesión: dejar el repo en estado verde (suite pasando), commit con mensaje descriptivo, y anotar en `LECCIONES.md` qué quedó a medias y cuál es el siguiente paso exacto.

---

## 3. Contexto crítico para no re-derivar (resumen de lo decidido)

### Decisiones vigentes (detalle en PRD-V2 §5 y REVISION-ARQUITECTO §1)

D1 archivar `backend/src/` · D2 `attendEvent` único · D3 UX optimista con reconciliación, BD fuente de verdad · D4 `llamada_at` = acción `CALL_REGISTERED` en timeline, no columna · D5 multi-tenant congelado (convención `ctx.tenant_id`) · D6 mocks visibles o muertos · D7 secretos fail-fast · D8 conector edge Dahua V3.26 · D9 push mínimo, email deseable · D10 access 60 min + refresh 10 h · D11 fuente única de datos = seed MySQL.

### Fechas y restricciones del PO (2026-06-11)

- Demos al cliente DURANTE el desarrollo → seguridad (Paso 2) y badge DEMO antes de cualquier demo.
- **≈25-jun-2026:** pruebas con NVR reales (checklist en PRD-V2 §6). **≈02-jul-2026:** go-live.
- Umbral M6: 15 minutos (configurable). Turnos guardia: 8 horas.
- Si el calendario aprieta: cae primero email, luego filtros server-side, luego `alert:updated`. **Seguridad nunca se recorta.** CRUD reglas UI ya está fuera del go-live.

### Hechos del repo que ahorran tiempo

- Stack: Next.js 16 + React 19 + Tailwind v4 (frontend :3000), Express 5 en `src/` (:4000, `STORE=mysql`), MySQL 9.x esquema `tns_cctv` (36 tablas prefijadas), WS nativo en `/ws/operations`.
- Arranque: `pnpm install` → `npm run demo:clean` (reset+seed+dev) o `dev:api`/`dev:web`. Login demo: `admin@agrolivo.cl` / `password123` (rotar antes de go-live).
- Transiciones de estado SOLO vía SP `stpr_register_event_state` (transacción + timeline append-only). No escribir estados de `ale_evento` por fuera del SP.
- `crear_base_datos.sql` usa `SOURCE` → solo cliente MySQL interactivo, no pipe batch.
- `db/sql_files` en minúsculas (referencias históricas a `SQL_FILES` rompen en Linux).
- `package.json` es `"type": "module"` con módulos `.cjs` mezclados — origen probable de la inestabilidad de tests.
- Rama de referencia: `integracion/funcionalidad-escalar-ddbb_inicial`.
- `INSTRUCCIONES_ACCESO.md` está desactualizado (describe auth mock) — actualizar antes del go-live.

### Anti-objetivos (no hacer)

No multi-tenant enforcement · no streaming en vivo (snapshots bastan para go-live; RTSP queda referenciado para P2) · no ORM · no rehacer UI/design system · no correlación S1/S2 · no fusionar `backend/src/` (archivar).

---

## 4. Protocolo de inicio de la próxima sesión

```
1. Leer HANDOFF.md (este) + LECCIONES.md (si existe) + PRD-V2.md
2. git status / git log -5        → estado real del repo
3. npm run db:verify              → esquema OK
4. npm test                       → ¿verde? Si no: Paso 0 es la tarea.
5. Identificar el primer goal pendiente según §2 y escribir su criterio verificable
6. Trabajar en loop (§1.1). Al cerrar: §2 Paso 6.
```

*Generado el 2026-06-11. Si este documento contradice a `PRD-V2.md`, prevalece `PRD-V2.md` y debe corregirse este handoff.*
