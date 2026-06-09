# DATABASE-SPEC.md

## Objetivo

Este archivo baja el nivel de detalle operativo del estado actual de la capa SQL: layout real, orquestadores, reglas de ejecucion y diferencias que hoy existen entre bundles.

## Layout real versionado

La carpeta real existente hoy es:

```text
db/
  migrations/
  sql_files/
    00_setup.sql
    01_ddl.sql
    02_indices.sql
    03_seed_inserts.sql
    04_procedures.sql
    05_functions.sql
    06_events.sql
    07_logs.sql
    01_CreacionDesdeCero/
    02_Funciones/
    04_StoredProcedures/
    05_Eventos/
    07_DatosIniciales/
    crear_base_datos.sql
    eliminar_base_datos.sql
```

## Caveat importante de path

Varios archivos del repo hablan de `db/SQL_FILES`, por ejemplo:
- `db/README.md`
- `db/tests/verify-sql.mjs`
- `db/sql_files/crear_base_datos.sql`

Pero el directorio commiteado es `db/sql_files` en minusculas.

En macOS esto puede pasar desapercibido por filesystem case-insensitive. En Linux case-sensitive es una divergencia real y potencialmente rompible.

## Especificacion del bundle ejecutable mas completo

### Orquestador real

Archivo:
- `db/sql_files/crear_base_datos.sql`

Hace hoy exactamente esto:
1. crea la base `tns_cctv`
2. ejecuta `USE tns_cctv`
3. fija `utf8mb4`, timezone UTC y `sql_mode`
4. ejecuta por `SOURCE` el bundle prefijado
5. ejecuta funcion, stored procedure, evento y configuracion inicial

Orden real de `SOURCE`:
- `01_CreacionDesdeCero/01_01_tablas_gen.sql`
- `01_CreacionDesdeCero/01_02_tablas_src.sql`
- `01_CreacionDesdeCero/01_03_tablas_ale.sql`
- `01_CreacionDesdeCero/01_04_tablas_log.sql`
- `01_CreacionDesdeCero/01_05_tablas_sal.sql`
- `01_CreacionDesdeCero/01_06_tablas_adm.sql`
- `01_CreacionDesdeCero/01_07_tablas_dah.sql`
- `02_Funciones/02_01_fun_normalize_plate.sql`
- `04_StoredProcedures/04_01_stpr_register_event_state.sql`
- `05_Eventos/05_01_evt_purge_idempotencia.sql`
- `07_DatosIniciales/07_01_datos_iniciales.sql`

## Reglas de diseño que hoy si existen en SQL

### 1. Prefijos modulares

El bundle completo usa estos prefijos:
- `gen_`
- `src_`
- `ale_`
- `log_`
- `sal_`
- `adm_`
- `dah_`

### 2. IDs largos tipo `CHAR(26)`

El bundle completo y el bundle core usan PKs de 26 caracteres.

### 3. Timezone de base en UTC

Esto aparece de forma explicita en:
- `db/sql_files/01_ddl.sql`
- `db/sql_files/crear_base_datos.sql`

### 4. Idempotencia modelada a nivel persistente

Tablas reales:
- `src_idempotencia_ingesta`
- `ingress_idempotency`
- `idempotency_keys`

### 5. Auditoria separada de timeline

Bundle completo:
- `log_evento_timeline`
- `log_auditoria_api`

Bundle core:
- `event_timeline`
- `api_audit_log`

## Stored procedure real de transicion

Archivo:
- `db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql`

Contrato real:
- actor permitido: `USER`, `SYSTEM`, `CONNECTOR`
- si `actor_type = USER`, `p_actor_id_usuario` es obligatorio
- lee estado actual desde `ale_evento`
- bloquea fila con `FOR UPDATE`
- valida:
  - `NEW -> IN_REVIEW`
  - `IN_REVIEW -> CLOSED`
- actualiza `decision_reason`
- inserta fila de timeline
- usa transaccion explicita con `START TRANSACTION` y `COMMIT`

## Eventos scheduler reales

### Bundle prefijado

Archivo:
- `db/sql_files/05_Eventos/05_01_evt_purge_idempotencia.sql`

Evento:
- `evt_purge_idempotencia`
- borra filas expiradas de `src_idempotencia_ingesta`

### Bundle core

Archivo:
- `db/sql_files/06_events.sql`

Eventos:
- `ev_purge_expired_idempotency`
- `ev_purge_old_health_incidents`

## Configuracion runtime modelada en BD

Tablas reales del bundle prefijado:
- `gen_configuracion_grupos`
- `gen_configuracion_parametros`
- `gen_configuracion_valores`

Esto significa que la idea de `ConfigLoader` si tiene soporte estructural en SQL, aunque hoy no existe un consumidor runtime cableado en Node/Frontend.

## Soporte real para Dahua

El detalle mas profundo hoy esta en el bundle prefijado:
- eventos crudos: `dah_evento_crudo`
- facial: `dah_deteccion_facial`, `dah_reconocimiento_facial`
- vehiculos: `dah_deteccion_vehiculo`
- IVS: `dah_evento_ivs`
- audio: `dah_evento_audio`
- grabaciones: `dah_archivo_grabacion`
- snapshots: `dah_snapshot`
- suscripciones: `dah_suscripcion`

Esto existe solo a nivel SQL. No hay todavia servicio runtime que lo pueble desde un conector Dahua en este repo.

## Especificacion del bundle core simplificado

Archivos:
- `01_ddl.sql`
- `02_indices.sql`
- `06_events.sql`
- `07_logs.sql`

Caracteristicas:
- nomenclatura en ingles
- menos tablas
- misma idea de dominio, pero comprimida
- indices separados de las tablas
- auditoria partida a `07_logs.sql`

No reemplaza al bundle completo; simplemente coexiste con el.

## Especificacion de la migracion bootstrap

Archivo:
- `db/migrations/001_init.sql`

Estado real:
- es una migracion minima
- usa `BIGINT`
- crea solo 8 tablas
- no cubre rules, notifications, health detallado, admissions completas ni Dahua

Utilidad real:
- bootstrap rapido
- referencia minima
- no representa el dominio completo

## Lo que NO hace hoy la capa de datos

- Ninguno de los backends actuales usa estas tablas en runtime.
- No hay ORM.
- No hay repositorio de acceso a datos compartido.
- No hay migrador unificado que el backend ejecute al arrancar.

## Verificacion existente

### `db/tests/verify-sql.mjs`

Valida de forma fuerte:
- tablas esperadas del bundle completo
- constraints e indices
- orden del orquestador
- stored procedure
- evento de purga

### `tests/data-model-sql.spec.js`

Valida de forma ligera:
- estructura general del folder
- presencia de `tenants`, `events`, `speed_cases`
- presencia de `api_audit_log`

## Decision pragmatica

Si hay que ejecutar o ampliar la base real del proyecto hoy:
1. el bundle mas completo es el prefijado
2. el orquestador real es `db/sql_files/crear_base_datos.sql`
3. hay que resolver antes la divergencia `SQL_FILES` vs `sql_files` si el runtime final sera Linux

---

## Actualización 2026-06-09 — Base creada y poblada en local

> Ver hand-off completo en `01-prd/HANDOFF_2026-06-09_BASE_DATOS_E_INTEGRACION.md`.

### La base ya existe físicamente
- Motor: MySQL **9.6.0** (Homebrew) en Mac M1.
- Base: `tns_cctv`, bundle **prefijado** (34 tablas + `fun_normalize_plate` + `stpr_register_event_state` + `evt_purge_idempotencia`).
- Usuario de aplicación: `tns_cctv_app` (`127.0.0.1` y `localhost`), permisos `SELECT/INSERT/UPDATE/DELETE/EXECUTE`.
- Config local: `db/connection-config.json` (creado, **ignorado por git**).

### Caveat de ejecución (importante)
El orquestador `crear_base_datos.sql` usa `SOURCE`, que **no se interpreta** al canalizar por `stdin` en modo batch (`mysql < archivo.sql`). Para crear la base se ejecutaron los archivos **uno por uno en orden** contra `tns_cctv`. Alternativa: abrir el cliente `mysql` interactivo y hacer `SOURCE`.

### Bug corregido
`01_CreacionDesdeCero/01_07_tablas_dah.sql`: columna `trigger` (palabra reservada) en `dah_snapshot` → ahora con backticks `` `trigger` ``.

### Datos demo (seed)
- **Un solo archivo estático:** `07_DatosIniciales/07_01_datos_iniciales.sql` (config, permisos, tenant, usuarios, fuentes, reglas, eventos, ingresos).
- Timestamps fijos (2026-06-09) y hash bcrypt fijo para `password123` → cada recreación de la BD produce los mismos datos.
- Idempotente (`INSERT ... ON DUPLICATE KEY UPDATE`).
- Contenido: 1 tenant, 1 site, 8 usuarios, 10 fuentes, 9 reglas, 12 eventos, 24 timeline, 5 ingresos.

### Consumo runtime
El bundle prefijado **ya se consume** desde `src/mysqlStore.cjs` (pool `db/lib/pool.cjs`) cuando el backend corre con `STORE=mysql`. Ya no es cierto que "ningún backend usa estas tablas en runtime".

### Rediseño 2026-06-09 (tarde)
- **36 tablas** (antes 34). Nuevas: `gen_permiso`, `gen_usuario_permiso` (autorización por permisos, sin roles).
- `gen_usuario`: `full_name` → `nombre` + `apellido`; **eliminada** la columna `role` (ENUM).
- **Bundle core legacy eliminado** (`01_ddl.sql`, `02_indices.sql`, `03_seed_inserts.sql`, `05_functions.sql`, `06_events.sql`, `07_logs.sql`, `00_setup.sql`, `04_procedures.sql`). Fuente única: bundle prefijado.
- Datos iniciales: **un solo archivo** `07_01_datos_iniciales.sql` (config + permisos + demo).
- `crear_base_datos.sql`: rutas en minúscula `db/sql_files`, instrucciones de uso en el encabezado, y SOURCE de todos los pasos.
- **`SOURCE` solo funciona en cliente interactivo** (`mysql> SOURCE db/sql_files/crear_base_datos.sql;` desde la raíz del repo).

---
Ultima actualizacion basada en codigo: 2026-06-09
