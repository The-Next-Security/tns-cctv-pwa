# DATA-MODEL.md

## Objetivo

Resume el modelo de datos **que realmente vive y se consume hoy** en el repositorio, más los artefactos legacy que permanecen versionados pero inactivos.

---

## Resumen ejecutivo

| Modelo | Archivos | Tablas | ¿Consumido en runtime? |
|--------|----------|--------|------------------------|
| **Prefijado (vivo)** | `db/sql_files/01_CreacionDesdeCero/*` | 36 | **Sí** — `src/mysqlStore.cjs` |
| Bootstrap mínimo | `db/migrations/001_init.sql` | 8 | No — referencia / pruebas iniciales |
| Core legacy inglés | `01_ddl.sql`, etc. | — | **Eliminado** (2026-06-09) |

**Decisión práctica:** el modelo prefijado es la única fuente de verdad operativa.

---

## Modelo prefijado — módulos y tablas

### `gen_` — General / multi-tenant

| Tabla | Propósito |
|-------|-----------|
| `gen_tenant` | Tenant (parque) |
| `gen_site` | Sitio dentro del tenant |
| `gen_usuario` | Usuarios (`nombre`, `apellido`, sin columna `role`) |
| `gen_permiso` | Catálogo de permisos (12 alineados con `lib/auth.ts`) |
| `gen_usuario_permiso` | N:M usuario ↔ permiso |
| `gen_acceso_sitio` | Usuario ↔ sitios autorizados |
| `gen_sesion` | Sesiones (modeladas, no usadas en runtime Node hoy) |
| `gen_configuracion_grupos` | Grupos de config runtime |
| `gen_configuracion_parametros` | Parámetros |
| `gen_configuracion_valores` | Valores por tenant/sitio |

### `src_` — Fuentes e ingesta

| Tabla | Propósito |
|-------|-----------|
| `src_fuente` | NVR, cámaras, conectores |
| `src_conector_edge` | Conectores edge |
| `src_idempotencia_ingesta` | Claves idempotencia ingest |

### `ale_` — Alertas y reglas

| Tabla | Propósito |
|-------|-----------|
| `ale_regla` | Reglas operativas (motor ingest + escalación) |
| `ale_evento` | **Eventos/alertas** — núcleo operativo |
| `ale_evidencia` | Evidencia asociada |
| `ale_notificacion` | Notificaciones (modelada, sin consumidor runtime) |

### `log_` — Trazabilidad

| Tabla | Propósito |
|-------|-----------|
| `log_evento_timeline` | Timeline append-only de decisiones |
| `log_auditoria_api` | Auditoría API (modelada, sin writer runtime) |

### `sal_` — Salud técnica

| Tabla | Propósito |
|-------|-----------|
| `sal_estado_fuente` | Estado de fuentes |
| `sal_incidente` | Incidentes de salud |
| `sal_chequeo` | Chequeos programados |

### `adm_` — Admisiones y velocidad

| Tabla | Propósito |
|-------|-----------|
| `adm_ingreso` | Ingresos vehiculares (recepción) |
| `adm_evento_velocidad` | Eventos de velocidad |
| `adm_evidencia_velocidad` | Evidencia velocidad |
| `adm_caso_velocidad` | Casos de infracción |
| `adm_candidato_correlacion` | Correlación ingreso ↔ evento |

### `dah_` — Dahua (detalle NVR)

| Tabla | Propósito |
|-------|-----------|
| `dah_evento_crudo` | Eventos crudos NVR |
| `dah_deteccion_facial` | Detecciones faciales |
| `dah_reconocimiento_facial` | Reconocimientos |
| `dah_deteccion_vehiculo` | Detecciones vehículo |
| `dah_evento_ivs` | IVS |
| `dah_evento_audio` | Audio |
| `dah_archivo_grabacion` | Grabaciones |
| `dah_snapshot` | Snapshots (columna `` `trigger` `` escapada) |
| `dah_suscripcion` | Suscripciones push NVR |

**Nota:** tablas `dah_*` existen en DDL; no hay servicio runtime que las pueble desde conector Dahua real en este repo.

---

## Convenciones de modelado

### Identificadores

- PKs `CHAR(26)` en modelo prefijado.
- Bootstrap usa `BIGINT AUTO_INCREMENT` (no operativo).

### Multi-tenant

- Columna `id_tenant` / FK a `gen_tenant`.
- Aislamiento **modelado en SQL**; enforcement en API **incompleto**.

### Estados de evento (`ale_evento.state`)

```
NEW → IN_REVIEW → CLOSED
NEW → ESCALATING → CLOSED
NEW → ESCALATING (activo)
CLOSED → NEW (reactivate)
```

Validado por `stpr_register_event_state`.

### Zonas

No hay tabla `zonas`. Se modelan como:
- `zone_code` en `ale_evento` (`zone-1` … `zone-8`)
- `metadata_json` en `src_fuente`

Frontend usa `PARK_ZONES` / `MOCK_ZONES` para UX.

---

## Mapeos runtime (frontend ↔ BD)

Implementados en `src/mysqlStore.cjs`:

| Concepto BD | Concepto UI |
|-------------|-------------|
| `state: NEW` | `status: pendiente` |
| `state: IN_REVIEW` | `status: en_revision` |
| `state: ESCALATING` | `status: escalada` |
| `state: CLOSED` + decisión | `resuelta` / `descartada` |
| Severidad 5/4 | `criticality: critica/alta` |
| Severidad 3/≤2 | `media/baja` |
| Permisos en `gen_usuario_permiso` | `user.permissions[]` |
| Inferencia permisos/email | `user.role` (presentación) |

**Gap:** `snapshot_url` mapeado a `null` — UI usa assets demo.

---

## Objetos programables

### Stored procedure

**Archivo:** `db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql`

- Bloquea `ale_evento` con `FOR UPDATE`.
- Valida transiciones permitidas.
- Inserta en `log_evento_timeline`.
- Usado por `mysqlStore.attendAlert()`.

### Función

**Archivo:** `db/sql_files/02_Funciones/02_01_fun_normalize_plate.sql`  
Normalización de patentes.

### Evento scheduler

**Archivo:** `db/sql_files/05_Eventos/05_01_evt_purge_idempotencia.sql`  
Purga `src_idempotencia_ingesta` expirada.

---

## Validación en repo

| Herramienta | Qué valida |
|-------------|------------|
| `db/tests/verify-sql.mjs` | 36 tablas, SP, evento, orden `crear_base_datos.sql` |
| `npm run db:verify` | Wrapper del script anterior |

---

## Datos demo (seed)

**Archivo:** `db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql`

- Idempotente (`ON DUPLICATE KEY UPDATE`).
- 1 tenant, 1 site, 8 usuarios, 10 fuentes, 9 reglas, 12 eventos, 24 timeline, 5 ingresos.
- Password demo: `password123` (bcrypt fijo en seed).

**Scripts adicionales:**
- `npm run db:seed-nvr` — simula ingest NVR → reglas → alertas nuevas.
- `npm run demo:clean` — reset pipeline alertas + seed + dev.

---

## Virtudes del modelo

1. **Modularidad por prefijo** — dominios claros (gen, ale, adm, dah).
2. **Timeline append-only** — auditoría de decisiones operativas.
3. **Idempotencia persistente** — ingest seguro.
4. **Autorización por permisos** — flexible vs roles fijos.
5. **Soporte Dahua estructural** — preparado para integración NVR profunda.
6. **SP transaccional** — consistencia en transiciones de estado.

---

## Defectos y riesgos

1. **`llamada_at` no modelado** — requisito UI de escalación sin columna/timeline dedicada.
2. **Tablas sin consumidor** — `dah_*`, `ale_notificacion`, `log_auditoria_api`, correlación.
3. **Bootstrap `001_init.sql` divergente** — puede confundir si alguien lo ejecuta pensando que es el modelo vivo.
4. **`SOURCE` en batch** — orquestador requiere cliente MySQL interactivo (ver `DATABASE-SPEC.md`).
5. **Case sensitivity** — referencias históricas a `SQL_FILES` vs `sql_files` (Linux).

---

**Última actualización basada en código:** 2026-06-11
