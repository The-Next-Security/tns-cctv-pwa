# SQL bundle

Esquema MySQL 8/9 del proyecto. SQL repartido en modulos; el orquestador solo enlaza.

## Layout

```text
db/sql_files/
  crear_base_datos.sql          <- orquestador (SOURCE a cada modulo)
  eliminar_base_datos.sql       <- DROP de la base
  01_CreacionDesdeCero/         <- tablas DDL
  02_Funciones/
  04_StoredProcedures/
  05_Eventos/
  07_DatosIniciales/
    07_01_datos_iniciales.sql   <- inserts de prueba
```

## Crear la base

Desde la **raiz del repositorio**, cliente `mysql` interactivo:

```bash
mysql --default-character-set=utf8mb4 -u root -p
```

**MySQL 9.x no soporta `SOURCE` anidado.** No uses
`SOURCE db/sql_files/crear_base_datos.sql` (falla con error 1064).

En su lugar, **copia y pega todo** el contenido de `crear_base_datos.sql`
en el prompt `mysql>`, o ejecuta cada linea `SOURCE ...` del archivo una a una.

Para borrar y recrear:

```sql
SOURCE db/sql_files/eliminar_base_datos.sql
-- luego pegar / ejecutar crear_base_datos.sql como arriba
```

Contraseña usuarios demo: `password123`.

## Verificacion

```bash
npm run db:verify
```
