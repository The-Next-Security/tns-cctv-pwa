# Base de datos TNS CCTV PWA

Esquema MySQL 8 para el MVP M1..M14, S1..S3 y la integración Dahua HTTP API
v3.26. El bundle implementa 34 tablas con prefijos `gen_`, `src_`, `ale_`,
`log_`, `sal_`, `adm_` y `dah_`.

## Requisitos

- MySQL 8.0.16 o superior.
- Usuario con permisos para crear base, tablas, rutinas y eventos.
- `event_scheduler=ON` para ejecutar la purga automática de idempotencia.

## Crear la base

Ejecutar desde la raíz del repositorio:

```bash
mysql --default-character-set=utf8mb4 -u root -p \
  < db/SQL_FILES/crear_base_datos.sql
```

La base creada se llama `tns_cctv`. El orquestador puede volver a ejecutarse:
las tablas usan `IF NOT EXISTS`, los objetos programables se recrean y los datos
de configuración se insertan de forma idempotente.

## Configuración local

```bash
cp db/connection-config.template.json db/connection-config.json
```

`db/connection-config.json` está ignorado por Git. Los secretos JWT no se
incluyen en los seeds y deben cargarse como valores activos antes de iniciar el
backend.

## Verificación

```bash
npm run db:verify
```

La validación comprueba estructura, tablas esperadas, orden del orquestador,
identificadores MySQL y reglas críticas del modelo. La prueba definitiva sigue
siendo ejecutar el bundle contra MySQL 8.

## Reversión local

```bash
mysql -u root -p < db/SQL_FILES/eliminar_base_datos.sql
```

Ese comando elimina la base completa y no debe ejecutarse en producción.
