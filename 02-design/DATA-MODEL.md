# DATA-MODEL.md

## Objetivo

Este documento resume el modelo de datos que realmente vive hoy en el repositorio. La conclusion principal es que no existe un unico modelo SQL: hoy conviven tres superficies distintas.

## Resumen ejecutivo

### Modelo A: bundle core simplificado

Archivos:
- `db/sql_files/01_ddl.sql`
- `db/sql_files/02_indices.sql`
- `db/sql_files/06_events.sql`
- `db/sql_files/07_logs.sql`

Perfil:
- nombres en ingles
- sin prefijos de modulo
- 19 tablas core en `01_ddl.sql`
- 1 tabla de auditoria extra en `07_logs.sql`

Tablas core detectadas hoy:
- `tenants`
- `sites`
- `users`
- `user_site_access`
- `auth_sessions`
- `sources`
- `ingress_idempotency`
- `rules`
- `events`
- `event_evidence`
- `event_timeline`
- `admissions`
- `speed_events`
- `speed_event_evidence`
- `speed_cases`
- `notifications`
- `edge_connectors`
- `device_health_status`
- `health_incidents`

Tabla adicional separada:
- `api_audit_log`

### Modelo B: bundle completo prefijado

Archivos:
- `db/sql_files/01_CreacionDesdeCero/01_01_tablas_gen.sql`
- `db/sql_files/01_CreacionDesdeCero/01_02_tablas_src.sql`
- `db/sql_files/01_CreacionDesdeCero/01_03_tablas_ale.sql`
- `db/sql_files/01_CreacionDesdeCero/01_04_tablas_log.sql`
- `db/sql_files/01_CreacionDesdeCero/01_05_tablas_sal.sql`
- `db/sql_files/01_CreacionDesdeCero/01_06_tablas_adm.sql`
- `db/sql_files/01_CreacionDesdeCero/01_07_tablas_dah.sql`
- `db/sql_files/crear_base_datos.sql`

Perfil:
- nombres prefijados por modulo
- enfoque mas cercano al diseño funcional del producto
- 34 tablas
- incluye Dahua, salud, correlacion y configuracion runtime
- es el modelo mas completo del repo

Tablas por modulo:

#### `gen_`
- `gen_tenant`
- `gen_site`
- `gen_usuario`
- `gen_acceso_sitio`
- `gen_sesion`
- `gen_configuracion_grupos`
- `gen_configuracion_parametros`
- `gen_configuracion_valores`

#### `src_`
- `src_fuente`
- `src_conector_edge`
- `src_idempotencia_ingesta`

#### `ale_`
- `ale_regla`
- `ale_evento`
- `ale_evidencia`
- `ale_notificacion`

#### `log_`
- `log_evento_timeline`
- `log_auditoria_api`

#### `sal_`
- `sal_estado_fuente`
- `sal_incidente`
- `sal_chequeo`

#### `adm_`
- `adm_ingreso`
- `adm_evento_velocidad`
- `adm_evidencia_velocidad`
- `adm_caso_velocidad`
- `adm_candidato_correlacion`

#### `dah_`
- `dah_evento_crudo`
- `dah_deteccion_facial`
- `dah_reconocimiento_facial`
- `dah_deteccion_vehiculo`
- `dah_evento_ivs`
- `dah_evento_audio`
- `dah_archivo_grabacion`
- `dah_snapshot`
- `dah_suscripcion`

### Modelo C: migracion bootstrap minima

Archivo:
- `db/migrations/001_init.sql`

Perfil:
- 8 tablas
- ids `BIGINT AUTO_INCREMENT`
- naming distinto
- alcance mucho menor

Tablas:
- `tenants`
- `sites`
- `users`
- `sources`
- `security_events`
- `event_state_history`
- `idempotency_keys`
- `audit_logs`

## Que valida realmente el repo

### Validacion del bundle prefijado

`db/tests/verify-sql.mjs` valida:
- existencia de las 34 tablas del bundle prefijado
- orden de `SOURCE` en `crear_base_datos.sql`
- constraints e indices dentro del limite de MySQL
- presencia del stored procedure de transicion de estados
- presencia del evento de purga de idempotencia

Conclusion:
- si hay que elegir el modelo mas defendible desde el codigo, hoy es el bundle prefijado

### Validacion del bundle core simplificado

`tests/data-model-sql.spec.js` valida solo de forma ligera:
- layout de `db/sql_files`
- presencia de `01_ddl.sql`
- presencia de algunas tablas base como `tenants`, `events`, `speed_cases`
- presencia de `api_audit_log`

Conclusion:
- el bundle core simplificado sigue vivo en pruebas, pero no es el modelo mas rico del repo

## Convenciones reales de modelado

### Identificadores

Bundle core y bundle prefijado:
- usan `CHAR(26)` como PK

Bootstrap:
- usa `BIGINT UNSIGNED AUTO_INCREMENT`

### Multi-tenant

Esta modelado de tres formas:
- core: `tenant_id`
- prefijado: `id_tenant`
- bootstrap: `tenant_id`

### Estado de eventos

Los tres modelos convergen en lo esencial:
- `NEW`
- `IN_REVIEW`
- `CLOSED`

### Idempotencia

Existe en los tres niveles:
- `ingress_idempotency` en el core
- `src_idempotencia_ingesta` en el prefijado
- `idempotency_keys` en bootstrap

## Routines y objetos programables reales

### Stored procedure implementado

Archivo:
- `db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql`

Funcion:
- bloquea `ale_evento` con `FOR UPDATE`
- valida solo `NEW -> IN_REVIEW` y `IN_REVIEW -> CLOSED`
- actualiza `ale_evento`
- inserta en `log_evento_timeline`

### Eventos programados

Bundle core:
- `ev_purge_expired_idempotency`
- `ev_purge_old_health_incidents`

Bundle prefijado:
- `evt_purge_idempotencia`

## Riesgos de verdad actual

1. No existe una sola nomenclatura.
2. No existe un solo orquestador runtime usado por la aplicacion.
3. La app frontend no consume ninguna tabla directamente.
4. Los backends actuales no estan cableados a MySQL.

## Fuente de verdad recomendada por uso

| Uso | Fuente mas fiel hoy |
|---|---|
| Modelo funcional completo del producto | bundle prefijado `01_CreacionDesdeCero/*` |
| Resumen core corto para contratos legacy | `01_ddl.sql` |
| Bootstrap local rapido | `001_init.sql` |

## Decision practica

Si hay que documentar "el modelo de datos del proyecto" sin inventar nada, hoy la mejor lectura es:
- el bundle prefijado es la especificacion mas completa
- el bundle core simplificado es una vista reducida del mismo dominio
- la migracion bootstrap es un artefacto aparte, util para pruebas iniciales

---
Ultima actualizacion basada en codigo: 2026-06-09
