# LECCIONES.md — Memoria del proyecto (outer loop)

> Formato según HANDOFF §1.2.4: `RULE: [principio general aplicable]`.
> Leer al inicio de cada sesión de código, después de HANDOFF.md.

## Reglas destiladas

- **RULE:** Verificar que un documento referenciado existe antes de depender de él.
  `PRD-V2.md` y `REVISION-ARQUITECTO.md` se citan como documentos maestros en
  `HANDOFF.md` pero **no están en el repo** (2026-06-11). La precedencia efectiva
  hoy es: HANDOFF.md > docs de `02-design/`.

- **RULE:** En parsers streaming por chunks, consumir un delimitador debe transicionar
  el estado de inmediato; si el byte siguiente aún no llegó, se necesita un estado
  intermedio explícito (`after-boundary`), no un `return` que olvide lo consumido.
  (Bug real del parser multipart con chunks de 1 byte.)

- **RULE:** Constantes derivadas de `process.env` se leen DENTRO de la función
  factory, no al cargar el módulo — si no, los tests no pueden configurarlas
  (`WS_AUTH_TIMEOUT_MS` en `src/server.js`).

- **RULE:** El repo raíz es `"type": "module"`, pero `src/` y `connector/` son
  CommonJS vía `package.json` local `{"type":"commonjs"}`. Todo directorio CJS
  nuevo necesita ese archivo o Node lo interpretará como ESM.

- **RULE:** `db/tests/verify-sql.mjs` valida un set EXACTO de tablas y el orden
  SOURCE del orquestador. Agregar una tabla = tocar 3 lugares: DDL en
  `01_CreacionDesdeCero/`, `expectedTables` del verificador y conteos en
  `02-design/DATABASE-SPEC.md` (hoy 37 tablas).

- **RULE:** `ale_notificacion.id_site` es NOT NULL: al registrar notificaciones
  derivar el site desde el evento, y si no hay evento, desde el primer site del
  tenant.

- **RULE:** Migración aditiva = archivo en `08_Migraciones/` (para BDs existentes)
  **y** reflejo en `01_CreacionDesdeCero/` (para instalaciones desde cero). El
  patrón ya estaba establecido (08_01, 08_05) — seguirlo siempre.

- **RULE:** Los alias de vocabulario "temporales" se fosilizan. El test de contrato
  `tests/alert-vocabulary.contract.spec.js` falla si `revisada/descartada/escalada`
  reaparecen como acciones API — no eliminarlo.

- **RULE:** El pool MySQL DEBE fijar `SET time_zone = '+00:00'` por conexión.
  Sin eso, `NOW()`/`CURRENT_TIMESTAMP` y los DEFAULT de las tablas escriben en el
  timezone del SO mientras los parámetros llegan en UTC — la misma tabla mezcla
  husos y el orden del timeline se corrompe (QA-04). La UI convierte a local;
  la BD y el API SIEMPRE hablan UTC. Guardia: `tests/db-timezone.contract.spec.js`.

- **RULE:** Toda clasificación de UI con contrato en el PRD necesita un test que
  la fije. `getAlertClass` degradaba las alertas `alta` a "Baja prioridad"
  contradiciendo PRD §5.3 (QA-03) y nadie lo notó hasta ver una alerta real en
  pantalla. Guardia: `tests/alert-class.contract.spec.js`.

- **RULE:** Ocultar menús por rol NO es autorización. El API aceptaba que un
  vigilante creara un `admin_parque` vía POST /users directo (QA-05). Toda
  mutación sensible necesita guard de rol en el SERVIDOR (`requireRole` en
  `src/auth.js`). Ojo: `GET /users` debe quedar abierto a autenticados porque
  alimenta los contactos de escalación. Guardia: `tests/users-rbac.contract.spec.js`.

- **RULE:** Página que consulta el API pero pinta datos hardcodeados = mock
  silencioso (viola D6). `/salud` llamaba `/health/nvrs` y renderizaba un array
  const con 3 NVRs falsos (QA-06). Patrón correcto: fetch real + fallback a mock
  CON toast "datos de demostración" (como `/recepcion`), y omitir métricas que el
  API aún no expone en lugar de inventarlas.

- **RULE:** En heartbeat M6, una fuente con `last_heartbeat_at = NULL` se muestra
  "ok" por diseño (no se evalúa antigüedad hasta el primer heartbeat). Decisión
  pendiente del PO: estado "sin datos" explícito. No "corregir" sin esa decisión.

- **RULE:** La columna de notas del timeline es `log_evento_timeline.comment_text`,
  NO `comment` — el mapper de la API la renombra a `comment` al exponerla, así que
  leer la salida del API no sirve para escribir SQL. Verificar nombres contra el
  DDL (`01_04_tablas_log.sql`) antes de tocar queries (error real del fix #50).

- **RULE:** `notes || target.decision` como comment es el mismo anti-patrón que los
  alias de vocabulario: fosiliza un enum interno como dato de usuario. Sin nota del
  operador, `comment_text` debe quedar NULL; la decisión vive en su propia columna
  (`decision`). De ahí salía el "Resuelta: CONFIRMED" de QA-13 (#54). Guardias:
  `tests/resolution-notes.contract.spec.js` y `tests/resolution-label.contract.spec.js`.

- **RULE:** El tipo `User` tiene `nombre` Y `full_name`, pero `/auth/me` solo llena
  `nombre`. Todo componente que muestre al usuario debe derivar
  `nombre ?? full_name ?? email` (el avatar "U" de QA-14/#55 venía de leer solo
  `full_name`). Ojo con el naming dual frontend/BD ya documentado para roles.

- **RULE:** `.gitignore` ignora `public/` COMPLETO (línea `public/`) aunque el
  comentario de arriba diga lo contrario. Todo asset nuevo de `public/` requiere
  `git add -f` (así se versionaron `sw.js`, `tns-logo.png` y ahora los íconos PWA
  de #48). Arreglar esa línea está en el backlog pre-go-live.

- **RULE:** `beforeinstallprompt` NO dispara en Chrome headless — la instalabilidad
  PWA se verifica por criterios (manifest con íconos 192/512 `purpose any` + SW
  activo + start_url) y se confirma a mano en el Chrome del PO.

- **RULE:** Para mostrar acciones de escalación fuera de la consola, replicar el
  patrón del card (`alert-card.tsx`): forzar `status: 'en_revision'` SOLO para la
  visibilidad de `CallContactsPopover`/`EscalateButton` (`showEscalationActions`
  exige en_revision). El SP sí permite NEW→ESCALATING, así que el flujo
  llamar→escalar desde una pendiente es válido server-side (#51).

## Estado al cierre de sesión 2026-06-11

**Verificación:** `npm test` 76/76 verde (×2 desde cero) · `tsc --noEmit` limpio ·
`npm run build` OK · `npm run db:verify` OK (37 tablas).

**Completado (HANDOFF §2):**
- Paso 0: suite verde y repetible.
- Paso 1: D1 (backend PoC → `docs/poc-security/`), D2 (`attendEvent` único + test
  de contrato), D3 (cero `.catch(() => {})` silenciosos; reconciliación + toasts),
  `GET /alerts/:id`, D7 (fail-fast `JWT_SECRET`).
- Paso 2: JWT en todo el API (salvo login/refresh/health), `req.user` real,
  API key `x-api-key` en ingest (hash en `src_conector_edge.api_key_hash`,
  migración 08_08), auth WS por frame con timeout 5 s.
- Paso 3: `connector/` completo (parser multipart, Digest RFC 7616, mapper +
  idempotencia, cliente ingest con reintentos, reconexión backoff) — desarrollado
  contra fixtures sintéticos de la spec.
- Paso 4: D10 (`/auth/me` + refresh rotativo 60 min/10 h, renovación silenciosa en
  el AuthProvider), D4 (`CALL_REGISTERED` en timeline vía `register_call`),
  M6 (heartbeat por fuente + umbrales en `gen_configuracion_*`, migración 08_09),
  D9 (Web Push VAPID: `public/sw.js`, suscripciones, envío al escalar, registro en
  `ale_notificacion`, migración 08_10).

**Pendiente — siguiente paso exacto:**
1. **Aplicar migraciones 08_08, 08_09 y 08_10 a la BD local** (requiere aprobación
   del protocolo de BD; son ALTER/CREATE aditivos) y validar E2E con
   `STORE=mysql npm run dev`.
2. Generar claves VAPID (`npx web-push generate-vapid-keys`) y definirlas en el
   entorno (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`).
3. **Spike de 1 día contra NVR físico** (≈antes del 25-jun): validar endpoints,
   grabar golden files que reemplacen los fixtures sintéticos, registrar
   desviaciones firmware-vs-spec aquí.
4. Migración mocks→seed (D11, tanda 1: `GET /tenants` + zonas) — no iniciada.
5. Snapshots reales → `dah_snapshot` + `ale_evidencia` (hoy: `file://` local).
6. Rotar credenciales demo y actualizar `INSTRUCCIONES_ACCESO.md` antes del go-live.
