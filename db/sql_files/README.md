# SQL bundle (fuente unica de verdad)

Esquema MySQL 8/9 del proyecto. **Solo existe el bundle prefijado** con prefijos
de modulo `gen_`, `src_`, `ale_`, `log_`, `sal_`, `adm_` y `dah_`.

> El antiguo "bundle core" en ingles (`01_ddl.sql`, `02_indices.sql`,
> `03_seed_inserts.sql`, `05_functions.sql`, `06_events.sql`, `07_logs.sql`) fue
> eliminado el 2026-06-09 para evitar la coexistencia de modelos. No vuelvas a
> crearlo.

## Layout

```text
db/sql_files/
  crear_base_datos.sql        <- ORQUESTADOR (ejecuta todo)
  eliminar_base_datos.sql     <- DROP de la base (solo local)
  01_CreacionDesdeCero/       <- tablas por modulo (gen/src/ale/log/sal/adm/dah)
  02_Funciones/               <- funciones (normalize_plate)
  04_StoredProcedures/        <- stpr_register_event_state (transicion de estados)
  05_Eventos/                 <- evento de purga de idempotencia
  07_DatosIniciales/
    07_01_datos_iniciales.sql <- UNICO archivo de inserts (config, permisos,
                                 tenant, usuarios, fuentes, reglas, eventos,
                                 ingresos). Editar directamente; no hay generador.
```

## Crear la base

Los `SOURCE` del orquestador son comandos del cliente `mysql`: **solo funcionan
en modo interactivo**, no con `mysql < archivo`.

Desde la **raiz del repositorio**:

```bash
mysql --default-character-set=utf8mb4 -u root -p
```
```sql
SOURCE db/sql_files/crear_base_datos.sql;
```

La base creada se llama `tns_cctv`. Todo es idempotente (`IF NOT EXISTS` /
`ON DUPLICATE KEY UPDATE`), se puede re-ejecutar.

Para recrear desde cero: ejecutar `eliminar_base_datos.sql` y luego
`crear_base_datos.sql` de nuevo.

## Datos de prueba

Todos los inserts viven en `07_DatosIniciales/07_01_datos_iniciales.sql`.
Timestamps fijos (2026-06-09) para que cada recreacion produzca los mismos datos.
Contraseña de todos los usuarios: `password123`.

## Verificacion estatica

```bash
npm run db:verify
```

## Modelo de autorizacion

Basado en **permisos** (no roles): `gen_permiso` (catalogo) + `gen_usuario_permiso`
(relacion N:M usuario-permiso). Definidos en `07_01_datos_iniciales.sql`.

## Reversion local

```bash
mysql -u root -p
```
```sql
SOURCE db/sql_files/eliminar_base_datos.sql;
```
