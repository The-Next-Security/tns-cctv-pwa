import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const sqlRoot = resolve(root, 'db/sql_files')

const creationFiles = [
  '01_CreacionDesdeCero/01_01_tablas_gen.sql',
  '01_CreacionDesdeCero/01_02_tablas_src.sql',
  '01_CreacionDesdeCero/01_03_tablas_ale.sql',
  '01_CreacionDesdeCero/01_04_tablas_log.sql',
  '01_CreacionDesdeCero/01_05_tablas_sal.sql',
  '01_CreacionDesdeCero/01_06_tablas_adm.sql',
  '01_CreacionDesdeCero/01_07_tablas_dah.sql',
]

const expectedTables = [
  'gen_tenant',
  'gen_site',
  'gen_usuario',
  'gen_permiso',
  'gen_usuario_permiso',
  'gen_acceso_sitio',
  'gen_sesion',
  'gen_configuracion_grupos',
  'gen_configuracion_parametros',
  'gen_configuracion_valores',
  'src_fuente',
  'src_conector_edge',
  'src_idempotencia_ingesta',
  'ale_regla',
  'ale_evento',
  'ale_evidencia',
  'ale_notificacion',
  'log_evento_timeline',
  'log_auditoria_api',
  'sal_estado_fuente',
  'sal_incidente',
  'sal_chequeo',
  'adm_ingreso',
  'adm_evento_velocidad',
  'adm_evidencia_velocidad',
  'adm_caso_velocidad',
  'adm_candidato_correlacion',
  'dah_evento_crudo',
  'dah_deteccion_facial',
  'dah_reconocimiento_facial',
  'dah_deteccion_vehiculo',
  'dah_evento_ivs',
  'dah_evento_audio',
  'dah_archivo_grabacion',
  'dah_snapshot',
  'dah_suscripcion',
]

const sqlByFile = new Map(
  creationFiles.map((file) => [
    file,
    readFileSync(resolve(sqlRoot, file), 'utf8'),
  ]),
)
const allCreationSql = [...sqlByFile.values()].join('\n')

const actualTables = [
  ...allCreationSql.matchAll(
    /CREATE TABLE IF NOT EXISTS\s+([a-z][a-z0-9_]*)\s*\(/g,
  ),
].map((match) => match[1])

assert.deepEqual(
  [...actualTables].sort(),
  [...expectedTables].sort(),
  'El conjunto de tablas no coincide con DATABASE-SPEC.md',
)
assert.equal(
  new Set(actualTables).size,
  actualTables.length,
  'Existen tablas duplicadas',
)

const identifiers = [
  ...allCreationSql.matchAll(
    /\b(?:CONSTRAINT|INDEX)\s+([a-z][a-z0-9_]*)/g,
  ),
].map((match) => match[1])

for (const identifier of identifiers) {
  assert.ok(
    identifier.length <= 64,
    `Identificador MySQL mayor a 64 caracteres: ${identifier}`,
  )
}

for (const table of expectedTables) {
  const prefix = table.split('_', 1)[0]
  assert.ok(
    ['gen', 'src', 'ale', 'log', 'sal', 'adm', 'dah'].includes(prefix),
    `Tabla sin prefijo de modulo permitido: ${table}`,
  )
}

const orchestrator = readFileSync(
  resolve(sqlRoot, 'crear_base_datos.sql'),
  'utf8',
)
const sources = [
  ...orchestrator.matchAll(/^SOURCE\s+(\S+)\s*;?\s*$/gm),
].map((match) => match[1])

const expectedSources = [
  ...creationFiles.map((file) => `db/sql_files/${file}`),
  'db/sql_files/02_Funciones/02_01_fun_normalize_plate.sql',
  'db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql',
  'db/sql_files/05_Eventos/05_01_evt_purge_idempotencia.sql',
  'db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql',
]

assert.deepEqual(
  sources,
  expectedSources,
  'El orden SOURCE del orquestador es incorrecto',
)

assert.doesNotMatch(
  orchestrator,
  /CREATE TABLE IF NOT EXISTS/,
  'crear_base_datos.sql debe ser orquestador delgado; el DDL vive en los modulos',
)

for (const source of sources) {
  readFileSync(resolve(root, source), 'utf8')
}

assert.match(
  allCreationSql,
  /UNIQUE \(id_evento_velocidad\)/,
  'Falta garantizar la relacion 1:1 de casos de velocidad',
)
assert.match(
  allCreationSql,
  /FOREIGN KEY \(id_caso_velocidad\)[\s\S]*REFERENCES adm_caso_velocidad/,
  'Falta la FK de notificaciones hacia casos de velocidad',
)

const procedure = readFileSync(
  resolve(
    sqlRoot,
    '04_StoredProcedures/04_01_stpr_register_event_state.sql',
  ),
  'utf8',
)
assert.match(procedure, /START TRANSACTION;/)
assert.match(procedure, /FOR UPDATE;/)
assert.match(procedure, /ESCALATING/)
assert.match(procedure, /INSERT INTO log_evento_timeline/)
assert.match(procedure, /COMMIT;/)

console.log(
  `Bundle SQL verificado: ${actualTables.length} tablas, `
    + `${identifiers.length} constraints/indices y ${sources.length} fuentes SOURCE.`,
)
