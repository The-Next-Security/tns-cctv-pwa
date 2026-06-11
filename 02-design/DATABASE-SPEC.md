# DATABASE-SPEC.md

## Objetivo

Detalle operativo de la capa SQL: layout, orquestador, reglas de ejecución, objetos programables y estado de consumo runtime.

---

## Layout versionado

```text
db/
  connection-config.template.json   # Plantilla (commiteada)
  connection-config.json            # Local (gitignored)
  lib/pool.cjs                      # Pool mysql2 para Node
  migrations/
    001_init.sql                    # Bootstrap mínimo (NO operativo)
  sql_files/
    crear_base_datos.sql            # Orquestador principal
    eliminar_base_datos.sql
    01_CreacionDesdeCero/           # DDL prefijado (36 tablas)
    02_Funciones/
    04_StoredProcedures/
    05_Eventos/
    07_DatosIniciales/
    08_Migraciones/                 # Migraciones incrementales
  seed/
    simulate-nvr-ingest.mjs
  tests/
    verify-sql.mjs
```

---

## Caveat: case sensitivity de paths

Varios archivos históricos referencian `db/SQL_FILES`. El directorio commiteado es `db/sql_files` (minúsculas). En macOS puede pasar desapercibido; en Linux case-sensitive puede romper scripts.

---

## Orquestador principal

**Archivo:** `db/sql_files/crear_base_datos.sql`

**Secuencia:**
1. Crea base `tns_cctv`
2. `USE tns_cctv`
3. Charset `utf8mb4`, timezone UTC, `sql_mode`
4. `SOURCE` del bundle prefijado en orden
5. Función, SP, evento scheduler, datos iniciales

**Orden de SOURCE:**
```
01_CreacionDesdeCero/01_01_tablas_gen.sql
01_CreacionDesdeCero/01_02_tablas_src.sql
01_CreacionDesdeCero/01_03_tablas_ale.sql
01_CreacionDesdeCero/01_04_tablas_log.sql
01_CreacionDesdeCero/01_05_tablas_sal.sql
01_CreacionDesdeCero/01_06_tablas_adm.sql
01_CreacionDesdeCero/01_07_tablas_dah.sql
02_Funciones/02_01_fun_normalize_plate.sql
04_StoredProcedures/04_01_stpr_register_event_state.sql
05_Eventos/05_01_evt_purge_idempotencia.sql
07_DatosIniciales/07_01_datos_iniciales.sql
```

### Cómo ejecutar

| Método | Funciona |
|--------|----------|
| Cliente interactivo `mysql> SOURCE db/sql_files/crear_base_datos.sql` | Sí |
| Pipe batch `mysql < crear_base_datos.sql` | **No** — `SOURCE` no se interpreta en stdin |
| Archivos uno por uno en orden | Sí (alternativa usada en setup inicial) |

---

## Reglas de diseño en SQL

1. **Prefijos modulares:** `gen_`, `src_`, `ale_`, `log_`, `sal_`, `adm_`, `dah_`
2. **PKs `CHAR(26)`**
3. **Timezone UTC** explícita en orquestador
4. **Idempotencia:** `src_idempotencia_ingesta`
5. **Timeline separada de auditoría API:** `log_evento_timeline` vs `log_auditoria_api`
6. **Autorización por permisos:** `gen_permiso` + `gen_usuario_permiso` (sin columna `role` en usuario)

---

## Stored procedure — transiciones de estado

**Archivo:** `04_StoredProcedures/04_01_stpr_register_event_state.sql`

**Contrato:**
- Actor: `USER` | `SYSTEM` | `CONNECTOR`
- Si `USER`, `p_actor_id_usuario` obligatorio
- Transiciones válidas:
  - `NEW → IN_REVIEW`
  - `NEW → ESCALATING`
  - `IN_REVIEW → ESCALATING`
  - `IN_REVIEW → CLOSED`
  - `ESCALATING → CLOSED`
- Actualiza `ale_evento.decision_reason`
- Inserta fila en `log_evento_timeline`
- Transacción explícita

**Consumidor runtime:** `src/mysqlStore.cjs` → `attendAlert()`.

---

## Evento scheduler

**Archivo:** `05_Eventos/05_01_evt_purge_idempotencia.sql`  
Evento `evt_purge_idempotencia` — purga filas expiradas de `src_idempotencia_ingesta`.

---

## Configuración runtime en BD

Tablas `gen_configuracion_*` modelan parámetros editables por tenant/sitio.

**Estado:** estructura lista; no hay `ConfigLoader` en Node/Frontend consumiéndolas hoy.

---

## Soporte Dahua (solo DDL)

Tablas `dah_*` cubren eventos crudos, IVS, facial, vehículo, audio, grabaciones, snapshots, suscripciones.

**Estado:** sin servicio runtime que las pueble desde conector Dahua en este repo.

**Fix aplicado:** `dah_snapshot.`trigger`` → backticks por palabra reservada MySQL.

---

## Migraciones incrementales

**Carpeta:** `db/sql_files/08_Migraciones/`

Ejemplos versionados:
- `08_01_adm_ingreso_recepcion.sql`
- `08_03_estado_escalating.sql`
- `08_06_usuario_rol.sql` (histórico — rediseño posterior eliminó columna role)

Verificar README en subcarpetas antes de aplicar en BD existente.

---

## Consumo runtime (actualizado)

| Componente | Conexión |
|------------|----------|
| `src/mysqlStore.cjs` | Pool `db/lib/pool.cjs` → `connection-config.json` |
| `scripts/ensure-demo-schema.mjs` | Preflight esquema para `demo:clean` |
| `db/seed/simulate-nvr-ingest.mjs` | Ingest demo vía API |

**Ya no es cierto** que "ningún backend usa estas tablas en runtime".

---

## Configuración local requerida

1. MySQL 9.x (probado 9.6.0)
2. Copiar `db/connection-config.template.json` → `db/connection-config.json`
3. Usuario app recomendado: `tns_cctv_app` con `SELECT/INSERT/UPDATE/DELETE/EXECUTE`
4. Ejecutar orquestador o `npm run db:verify` tras crear esquema

---

## Verificación

```bash
npm run db:verify   # node db/tests/verify-sql.mjs
```

Valida: 36 tablas, constraints, índices, SP, evento, orden del orquestador.

---

## Virtudes

1. Orquestador documentado con orden explícito de SOURCE.
2. Seed idempotente con datos demo reproducibles.
3. SP centraliza reglas de transición — un solo punto de verdad.
4. Script `verify-sql.mjs` automatiza validación estructural.
5. Migraciones incrementales versionadas en `08_Migraciones/`.

---

## Defectos

1. **`SOURCE` no batch-friendly** — fricción en CI/automatización.
2. **Bundle bootstrap `001_init.sql` coexistente** — riesgo de confusión.
3. **Sin migrador unificado** — no hay herramienta tipo Flyway/Liquibase; aplicación manual.
4. **Sin ORM** — SQL directo en `mysqlStore.cjs`; cambios de esquema requieren sync manual.
5. **Objetos programables no todos consumidos** — evento scheduler requiere `event_scheduler=ON` en MySQL.

---

**Última actualización basada en código:** 2026-06-11
