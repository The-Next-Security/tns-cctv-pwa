# HAND-OFF — Base de datos MySQL e integración Frontend ↔ Backend ↔ BD

> Fecha: 2026-06-09
> Branch: `integracion/funcionalidad-escalar-ddbb_inicial`
> Autor de la sesión: Asistente IA (rol: desarrollador senior)
> Estado: **Trabajo NO commiteado** (pendiente de aprobación del usuario)

---

## 1. Objetivo de la sesión

Pasar el proyecto de "frontend con datos mock + SQL solo diseñado" a un **flujo real end-to-end**:

1. Crear físicamente la base de datos MySQL en el entorno local (Mac M1, MySQL 9.6 vía Homebrew).
2. Migrar los datos demo que vivían en `lib/mock-data.ts` a la base de datos.
3. Conectar backend y frontend a esa base para poder probar el flujo completo (login real + consola operativa).

Las tres fases se completaron y se verificaron en navegador real.

---

## 2. Estado del arte ANTES de esta sesión

- Frontend Next.js (App Router) funcionando 100% con mocks (`lib/mock-data.ts`) y login demo que aceptaba cualquier credencial.
- Backend `src/` (Express + WS) con contrato mínimo de eventos, **solo in-memory**.
- Backend paralelo `backend/src/` (hardening PoC), también in-memory.
- Capa SQL: 3 modelos coexistiendo (bootstrap, core, prefijado), **ninguno ejecutado ni consumido en runtime**.
- `package.json` con dependencias inconsistentes (ediciones sin commitear que habían degradado `next` 16→9, etc.).

Referencia de diagnóstico: `02-design/ARCHITECTURE.md`, `02-design/DATA-MODEL.md`, `02-design/DATABASE-SPEC.md`.

---

## 3. Lo que se hizo (resumen ejecutivo)

| Fase | Resultado |
|---|---|
| **1. Crear BD** | Base `tns_cctv` creada con el bundle prefijado completo: 34 tablas + función + stored procedure + evento. |
| **2. Seed Agrolivo** | Datos demo migrados desde los mocks a la BD mediante un generador determinista. |
| **3. Integración** | Backend `src/` cableado a MySQL; frontend con login real y consola operativa leyendo/escribiendo en la BD. |
| **Extra: Dependencias** | Resueltos los conflictos de `npm install` y se dejó `npm test` en verde (16/16). |

---

## 4. Detalle Fase 1 — Base de datos

### 4.1 Entorno
- MySQL **9.6.0** (Homebrew) corriendo como servicio en el Mac.
- Conexión administrativa: usuario `root` (credenciales en poder del usuario, **no** versionadas).

### 4.2 Cómo se creó
El orquestador `db/sql_files/crear_base_datos.sql` usa `SOURCE`, que **no funciona** al canalizar por `stdin` en modo batch. Se ejecutaron los archivos en orden manualmente contra la base `tns_cctv` (ver orden en `02-design/DATABASE-SPEC.md`).

### 4.3 Bug corregido en el bundle SQL
`db/sql_files/01_CreacionDesdeCero/01_07_tablas_dah.sql`: la columna `trigger` de la tabla `dah_snapshot` es **palabra reservada** en MySQL → se encerró en backticks:

```sql
`trigger`        ENUM('ON_DEMAND','EVENT','SCHEDULED') NOT NULL,
```

### 4.4 Usuario de aplicación
Creado `tns_cctv_app` (hosts `127.0.0.1` y `localhost`) con permisos `SELECT, INSERT, UPDATE, DELETE, EXECUTE` sobre `tns_cctv`.

### 4.5 Configuración de conexión
- `db/connection-config.json` creado a partir de `db/connection-config.template.json`.
- **Está en `.gitignore`** (verificado). Contiene credenciales → NO se commitea.

### 4.6 Verificación
```bash
npm run db:verify
# -> Bundle SQL verificado: 34 tablas, 177 constraints/indices y 11 fuentes.
```

---

## 5. Detalle Fase 2 — Migración de datos demo (seed Agrolivo)

### 5.1 Archivo único de datos iniciales
**`db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql`** contiene todos los inserts necesarios para pruebas locales:

- Configuración del sistema (`gen_configuracion_*`)
- Catálogo de permisos (`gen_permiso`) y asignaciones (`gen_usuario_permiso`)
- Tenant, sitio, usuarios, fuentes, reglas, eventos, timeline e ingresos

Timestamps fijos (2026-06-09) y hash bcrypt fijo para `password123`. **No hay generador externo** — editar el archivo SQL directamente. Idempotente (`ON DUPLICATE KEY UPDATE`).

> Histórico: existió un generador `db/seed/generate-seed-agrolivo.mjs` y un script `db/crear-base-datos.sh`; ambos fueron eliminados el 2026-06-09 por simplificación.

### 5.2 Datos cargados
- **1 tenant** (Parque Industrial Agrolivo), **1 site**.
- **5 usuarios** (ver tabla en sección 8).
- **10 fuentes** (`src_fuente`): 2 NVR + 8 cámaras, con `metadata_json` (ip, canal, zona).
- **9 reglas** (`ale_regla`) con `conditions_json`/`actions_json`.
- **12 eventos** (`ale_evento`): 5 NEW, 2 IN_REVIEW, 5 CLOSED.
- **24 filas de timeline** (`log_evento_timeline`).
- **5 ingresos vehiculares** (`adm_ingreso`).

> Las zonas (8) NO tienen tabla propia en el bundle; se modelan como `zone_code` (`zone-1`…`zone-8`) en eventos y en `metadata_json` de las cámaras.

---

## 6. Detalle Fase 3 — Integración Frontend ↔ Backend ↔ BD

### 6.1 Capa de acceso a datos (nuevo)
- `db/lib/pool.cjs`: pool `mysql2/promise` que lee `connection-config.json`.
- `src/mysqlStore.cjs`: implementa la **misma interfaz** del store en memoria, con MySQL:
  - `auth(email,password)` → valida contra `gen_usuario` con bcrypt; devuelve rol app (español).
  - `listAlerts()` / `getAlert()` → mapea `ale_evento` (+ última decisión del timeline) a la forma `Alert` del frontend.
  - `attendAlert(eventId, action, notes)` → transiciones de estado (multi-paso `NEW→IN_REVIEW→CLOSED`) usando el stored procedure `stpr_register_event_state`.
  - `ingestEvent()` → inserta evento + idempotencia + timeline.
  - `resolveEventId()` → resuelve el id real `CHAR(26)` desde el surrogate numérico que usa la UI.

### 6.2 Backend `src/` adaptado
- `src/app.js`: handlers convertidos a `async/await`; **nuevos endpoints**:
  - `GET /api/v1/alerts` → `{ items, data, pagination, ... }` (sirve ambos contratos).
  - `POST /api/v1/alerts/:eventId/attend` → acepta `acknowledge/resolve/escalate/discard` **y** el vocabulario existente `revisada/descartada/escalada`; resuelve ids numéricos.
  - `POST /api/v1/auth/login` ahora devuelve también `token` y un `user` con rol en español (alias para `lib/api.ts`).
- `src/server.js`: selecciona store con `STORE=mysql` (si no, usa el in-memory).
- `src/package.json` **(nuevo)**: `{"type":"commonjs"}` para resolver la inconsistencia (el repo raíz es `type: module` pero `src/` es CommonJS).

### 6.3 Frontend cableado
- `components/providers/auth-provider.tsx`: **login real** contra `/api/v1/auth/login`. Rechaza credenciales inválidas con "Correo o contraseña incorrectos".
- `next.config.mjs`: **proxy** `rewrites()` de `/api/v1/*` → `http://127.0.0.1:4000` (configurable con `API_PROXY_TARGET`).
- `app/(dashboard)/operacion/page.tsx`: carga alertas reales desde `alertsApi.list()` (fallback a mock si el backend no responde) y persiste acciones vía `attendEvent` (best-effort, mantiene UX optimista).
- `lib/api.ts`: nuevo método `alerts.attendEvent(eventId, action, notes)`.
- `lib/types.ts`: `Alert` ahora tiene `event_id?: string` (correlación con la BD).

### 6.4 Mapeos clave (referencia rápida)
- **Rol BD→app** (por email para los 5 demo; fallback por ENUM): ver `EMAIL_TO_APP_ROLE` en `src/mysqlStore.cjs`.
- **Estado→status**: `NEW→pendiente`, `IN_REVIEW→en_revision`, `CLOSED + decision` → `resuelta` / `descartada` (FALSE_POSITIVE) / `escalada` (ESCALATED).
- **Severidad→criticidad**: 5→critica, 4→alta, 3→media, ≤2→baja.
- **Acción→transición**: `acknowledge→IN_REVIEW (TOMAR)`, `resolve→CLOSED (CONFIRMED)`, `escalate→CLOSED (ESCALATED)`, `discard→CLOSED (FALSE_POSITIVE)`.

---

## 7. Dependencias — qué se arregló

Causa raíz: ediciones previas sin commitear habían **degradado `next` de 16 → 9** y subido `vite`/`vitest` sin alinear el ecosistema; además la reinstalación limpia expuso paquetes nunca declarados.

Cambios en `package.json`:
- `next` → `^16.2.7` (restaurado).
- `@vitejs/plugin-react` → `^6.0.2` (compat. con `vite@8`).
- **Agregados** (devDeps): `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `tw-animate-css`, `supertest@^7`.
- **Eliminado**: dependencia directa espuria `ipaddr.js`.
- **Scripts nuevos**: `api:mysql`.

Otros:
- `vitest.config.mjs` **(nuevo)**: `globals: true`, entorno node.
- `tests/ws.operations.spec.js`: migrado de callbacks `done` (removidos en vitest 4) a promesas.

Resultado: `npm install` limpio **sin** `--legacy-peer-deps` (2 vulnerabilidades moderadas vs 87 antes) y **`npm test` 16/16 verde**.

---

## 8. Usuarios de prueba (reales, en la BD)

**Contraseña para todos:** `password123`

| Email | Nombre | Rol BD | Rol app | Entra a | Estado |
|---|---|---|---|---|---|
| `admin@agrolivo.cl` | Carlos Rodriguez | ADMIN | `admin_parque` | `/operacion` | ACTIVE |
| `supervisor@agrolivo.cl` | Maria Gonzalez | OPS | `supervisor` | `/operacion` | ACTIVE |
| `operador@agrolivo.cl` | Juan Perez | GUARD | `vigilante` | `/operacion` | ACTIVE |
| `recepcionista@agrolivo.cl` | Ana Silva | GUARD | `recepcion` | `/recepcion` | ACTIVE |
| `tecnico@agrolivo.cl` | Roberto Diaz | OPS | `soporte_tns` | `/salud` | ACTIVE |

> `tecnico@agrolivo.cl` se activó en esta sesión (UPDATE en BD + `active: true` en el generador del seed). El login real solo acepta estos 5 emails; cualquier otra combinación devuelve 401.

---

## 9. Cómo levantar el stack

```bash
# 1. Backend conectado a MySQL (puerto 4000)
STORE=mysql PORT=4000 node src/server.js
#   atajo: npm run api:mysql  (usa puerto por defecto 3000; para 4000 usar la línea de arriba)

# 2. Frontend Next.js (puerto 3000, proxy a :4000)
npx next dev -p 3000

# 3. Entrar
#   http://localhost:3000/login  (usuarios de la sección 8, password123)
```

Recrear / resetear la BD:
```bash
# Crear esquema (ejecutar archivos en orden, ver DATABASE-SPEC.md)
# Resetear datos demo:
mysql -u root tns_cctv -e "DELETE FROM log_evento_timeline; DELETE FROM ale_evento;"
mysql --default-character-set=utf8mb4 -u root tns_cctv < db/sql_files/07_DatosIniciales/07_02_seed_agrolivo_demo.sql
npm run db:verify
```

---

## 10. Verificación realizada

- `npm run db:verify` → OK (34 tablas).
- Smoke test capa de datos: `node db/tests/smoke-mysql-store.cjs` → login, list, transición SP, transición inválida, timeline.
- `npm test` → 16/16.
- Backend directo (`:4000`) y vía proxy Next (`:3000`): login válido/ inválido, `/alerts`, `attend`.
- **Navegador real**: login inválido rechazado, login válido entra a `/operacion`, consola muestra alertas del seed con estados/criticidades, modal de detalle con acciones.

---

## 11. Pendientes / fuera de alcance (estado del arte actual)

1. **Realtime no unificado**: el frontend espera `socket.io` en `/realtime`; el backend `src/` usa `ws` en `/ws/operations`. En la consola aparece el banner "Error de conexión" (esperado).
2. **Hydration warning** (timestamps "hace X min"): preexistente, cosmético.
3. **Resto del frontend sigue en mock**: recepción (`adm_ingreso` ya tiene datos pero la UI no los lee), reglas, expedientes, reportes, salud, admin.
4. **`backend/src/` (hardening PoC)** sigue sin integrar; no comparte contrato con `src/`.
5. **Otros 2 modelos SQL** (bootstrap `001_init.sql` y core `01_ddl.sql`) siguen existiendo; el modelo vivo es el **prefijado**.
6. **2 vulnerabilidades moderadas** de npm (no críticas).
7. **Nada está commiteado** — pendiente de aprobación del usuario (regla del proyecto: un archivo = un commit).

---

## 12. Inventario de archivos tocados/creados

**Nuevos:**
- `db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql` (único archivo de inserts)
- `db/lib/pool.cjs`
- `db/tests/smoke-mysql-store.cjs`
- `src/mysqlStore.cjs`
- `src/package.json`
- `vitest.config.mjs`
- `db/connection-config.json` *(ignorado por git, local)*
- `01-prd/HANDOFF_2026-06-09_BASE_DATOS_E_INTEGRACION.md` *(este archivo)*

**Modificados:**
- `db/sql_files/01_CreacionDesdeCero/01_07_tablas_dah.sql` (fix `trigger`)
- `src/app.js`, `src/server.js`
- `lib/api.ts`, `lib/types.ts`
- `components/providers/auth-provider.tsx`
- `app/(dashboard)/operacion/page.tsx`
- `next.config.mjs`
- `package.json`, `package-lock.json`
- `tests/ws.operations.spec.js`
- `02-design/ARCHITECTURE.md`, `02-design/DATA-MODEL.md`, `02-design/DATABASE-SPEC.md`, `02-design/API.md` (secciones de actualización 2026-06-09)

---

## ADDENDUM 2026-06-09 (tarde) — Rediseño de usuarios y autorización por permisos

Tras el primer hand-off se aplicaron cambios de esquema solicitados por el usuario. **La BD se recreó desde cero** (DROP + recreate).

### Cambios de modelo
1. **`gen_usuario`**: se eliminó `full_name` (ahora **`nombre`** + **`apellido`**) y se **eliminó la columna `role`**.
2. **Autorización por permisos (sin roles)**: nuevas tablas
   - `gen_permiso` — catálogo (12 permisos, alineado con `lib/auth.ts`).
   - `gen_usuario_permiso` — relación N:M usuario↔permiso.
   - Total de tablas: **34 → 36**.
3. **Bundle core legacy ELIMINADO** (`00_setup.sql`, `01_ddl.sql`, `02_indices.sql`, `03_seed_inserts.sql`, `04_procedures.sql`, `05_functions.sql`, `06_events.sql`, `07_logs.sql`) + su test `tests/data-model-sql.spec.js`. Queda **una sola fuente de verdad**: el bundle prefijado.
4. **Orquestador `crear_base_datos.sql`**: encabezado con instrucciones, rutas en minúscula (`db/sql_files`) y SOURCE de un solo archivo de datos: `07_01_datos_iniciales.sql`.

### Archivos de datos iniciales
- `07_01_datos_iniciales.sql` — **único archivo** (config + permisos + demo). Sin generador externo.

### Usuarios (ahora 8)
Se agregaron 3 usuarios reales TNS con **administración completa** (12 permisos):
`andres@thenextsecurity.cl` (Andres Vasquez), `felipe@thenextsecurity.cl` (Felipe Vásquez), `raimundo@thenextsecurity.cl` (Raimundo Sanchez). Contraseña `password123`.

Permisos por usuario: admin Agrolivo y los 3 TNS = 12 (todos); supervisor = 8; operador = 4; recepcionista = 3; tecnico = 4.

### Backend
- `src/mysqlStore.cjs`: `auth()` ahora lee `nombre`/`apellido` y trae los **permisos** del usuario (JOIN). Devuelve `permissions: string[]` y un `app_role` derivado (etiqueta de presentación: por email para usuarios conocidos, o inferido de los permisos). La BD ya no almacena roles.
- `src/app.js`: el `user` del login incluye `nombre`, `apellido`, `permissions[]` y `role` (hint).

### Frontend (sin cambios estructurales)
El frontend sigue siendo role-based y funciona con el `role` hint. **Deuda pendiente**: migrar el frontend a autorización por permisos (`user.permissions`).

### Verificación
- `npm run db:verify` → 36 tablas, 182 constraints/índices, 11 fuentes.
- `npm test` → 14/14 (se eliminó el test del bundle legacy).
- Login backend probado: `andres@thenextsecurity.cl` (role `admin_parque`, 12 permisos) y `recepcionista@agrolivo.cl` (role `recepcion`, 3 permisos).
- BD reseteada a estado limpio (eventos 5 NEW / 2 IN_REVIEW / 5 CLOSED).

### Aclaración sobre `crear_base_datos.sql`
Los `SOURCE` **solo** se interpretan en el cliente `mysql` interactivo. Desde la raíz del repo:

```sql
mysql> SOURCE db/sql_files/crear_base_datos.sql;
```

Para recrear desde cero: `SOURCE db/sql_files/eliminar_base_datos.sql;` y luego volver a ejecutar `crear_base_datos.sql`.

---
Última actualización basada en código: 2026-06-09
