/**
 * Preflight de demo: migraciones mínimas + verificación de seed base.
 * Idempotente: seguro ejecutar en cada demo:clean.
 *
 * Preserva (no toca):
 *   ale_regla, src_fuente, gen_*, adm_ingreso, permisos, configuración.
 *
 * El reset de alertas lo hace db/seed/simulate-nvr-ingest.mjs (solo pipeline NVR).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getPool } = require('../db/lib/pool.cjs');

const TENANT_ID = 'TN000000000000000000000001';
const SITE_ID = 'ST000000000000000000000001';
const EXPECTED_RULES = 9;
const EXPECTED_CAMERAS = 8;

async function columnType(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_TYPE AS t
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0]?.t ?? '';
}

function isAlterDenied(err) {
  return err?.errno === 1142 || /ALTER command denied/i.test(String(err?.message ?? ''));
}

async function ensureRolColumn(pool) {
  const current = await columnType(pool, 'gen_usuario', 'rol');
  if (!current) {
    try {
      await pool.query(
        `ALTER TABLE gen_usuario ADD COLUMN rol VARCHAR(32) NOT NULL DEFAULT 'visualizador' AFTER telefono`
      );
      console.log('  · Migración aplicada: gen_usuario.rol');
    } catch (err) {
      if (!isAlterDenied(err)) throw err;
      console.warn('  ⚠ Falta columna gen_usuario.rol; el usuario de BD no tiene permiso ALTER.');
      console.warn('    Ejecuta como admin MySQL: db/sql_files/08_Migraciones/08_06_usuario_rol.sql');
      return;
    }
  } else {
    console.log('  · Columna gen_usuario.rol OK');
  }

  const backfill = [
    ['admin@agrolivo.cl', 'admin_parque'],
    ['supervisor@agrolivo.cl', 'supervisor'],
    ['operador@agrolivo.cl', 'vigilante'],
    ['recepcionista@agrolivo.cl', 'recepcionista'],
    ['tecnico@agrolivo.cl', 'tecnico'],
    ['seguridad@agrolivo.cl', 'responsable_seguridad'],
    ['andres@thenextsecurity.cl', 'admin_parque'],
    ['felipe@thenextsecurity.cl', 'admin_parque'],
    ['raimundo@thenextsecurity.cl', 'admin_parque'],
  ];
  for (const [email, rol] of backfill) {
    await pool.query(`UPDATE gen_usuario SET rol = ? WHERE email = ? AND (rol IS NULL OR rol = '' OR rol = 'visualizador')`, [
      rol,
      email,
    ]);
  }
}

async function ensureTelefonoColumn(pool) {
  const current = await columnType(pool, 'gen_usuario', 'telefono');
  if (current) {
    console.log('  · Columna gen_usuario.telefono OK');
    return;
  }

  try {
    await pool.query(
      `ALTER TABLE gen_usuario ADD COLUMN telefono VARCHAR(32) NULL AFTER email`
    );
    console.log('  · Migración aplicada: gen_usuario.telefono');
  } catch (err) {
    if (!isAlterDenied(err)) throw err;
    console.warn('  ⚠ Falta columna gen_usuario.telefono; el usuario de BD no tiene permiso ALTER.');
    console.warn('    Ejecuta como admin MySQL:');
    console.warn('    SOURCE db/sql_files/08_Migraciones/08_05_usuario_telefono.sql');
    console.warn('    (demo:clean continúa; teléfonos de escalación usarán mocks hasta aplicar la migración)');
  }
}

async function ensureEscalatingEnum(pool, table, column) {
  const current = await columnType(pool, table, column);
  if (!current) return;
  if (current.includes('ESCALATING')) return;

  try {
    await pool.query(
      `ALTER TABLE \`${table}\`
          MODIFY \`${column}\` ENUM('NEW','IN_REVIEW','ESCALATING','CLOSED') ${column === 'state' ? "NOT NULL DEFAULT 'NEW'" : 'NULL'}`
    );
    console.log(`  · Migración aplicada: ${table}.${column} (+ESCALATING)`);
  } catch (err) {
    if (!isAlterDenied(err)) throw err;
    console.warn(
      `  ⚠ ${table}.${column} sin ESCALATING; sin permiso ALTER. Ejecuta 08_03_estado_escalating.sql y 08_04_timeline_escalating.sql como admin.`
    );
  }
}

async function ensureStoredProcedure(pool) {
  const [rows] = await pool.query(
    `SELECT ROUTINE_NAME
       FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME = 'stpr_register_event_state'
      LIMIT 1`
  );
  if (!rows[0]) {
    throw new Error(
      'Falta el procedimiento stpr_register_event_state. Ejecuta db/sql_files/04_StoredProcedures/04_01_stpr_register_event_state.sql'
    );
  }
}

async function ensureBaseSeed(pool) {
  const [[tenant]] = await pool.query(
    `SELECT id_tenant FROM gen_tenant WHERE id_tenant = ? LIMIT 1`,
    [TENANT_ID]
  );
  if (!tenant) {
    throw new Error(
      'Tenant demo no encontrado. Ejecuta primero db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql (o crear_base_datos.sql completo).'
    );
  }

  const [[ruleCount]] = await pool.query(
    `SELECT COUNT(*) AS n FROM ale_regla WHERE id_tenant = ? AND id_site = ?`,
    [TENANT_ID, SITE_ID]
  );
  if (Number(ruleCount.n) < 1) {
    throw new Error(
      'No hay reglas operativas (ale_regla). Carga 07_01_datos_iniciales.sql antes de demo:clean.'
    );
  }
  if (Number(ruleCount.n) < EXPECTED_RULES) {
    console.warn(
      `  ⚠ Reglas en BD: ${ruleCount.n} (esperadas ~${EXPECTED_RULES}). El seed NVR seguirá con las disponibles.`
    );
  }

  const [[cameraCount]] = await pool.query(
    `SELECT COUNT(*) AS n
       FROM src_fuente
      WHERE id_tenant = ? AND source_type = 'CAMERA' AND status = 'ACTIVE'`,
    [TENANT_ID]
  );
  if (Number(cameraCount.n) < 1) {
    throw new Error(
      'No hay cámaras activas (src_fuente). Carga 07_01_datos_iniciales.sql antes de demo:clean.'
    );
  }
  if (Number(cameraCount.n) < EXPECTED_CAMERAS) {
    console.warn(
      `  ⚠ Cámaras activas: ${cameraCount.n} (esperadas ~${EXPECTED_CAMERAS}).`
    );
  }

  const [[userCount]] = await pool.query(
    `SELECT COUNT(*) AS n FROM gen_usuario WHERE id_tenant = ?`,
    [TENANT_ID]
  );
  if (Number(userCount.n) < 1) {
    throw new Error('No hay usuarios demo. Carga 07_01_datos_iniciales.sql.');
  }

  const [sampleRules] = await pool.query(
    `SELECT id_regla, name
       FROM ale_regla
      WHERE id_tenant = ? AND id_site = ?
      ORDER BY priority_order ASC
      LIMIT 3`,
    [TENANT_ID, SITE_ID]
  );
  const preview = sampleRules
    .map((r) => {
      const suffix = String(r.id_regla).match(/(\d+)$/)?.[1] ?? '?';
      const code = `Regla-${String(parseInt(suffix, 10)).padStart(4, '0')}`;
      return `${code} · ${r.name}`;
    })
    .join(' | ');
  console.log(`  · Reglas OK (${ruleCount.n}) — ej.: ${preview}`);
  console.log(`  · Cámaras OK (${cameraCount.n}) · Usuarios OK (${userCount.n})`);
}

async function main() {
  const pool = getPool();
  try {
    console.log('Verificando esquema y seed base de demo…');
    await ensureBaseSeed(pool);
    await ensureTelefonoColumn(pool);
    await ensureRolColumn(pool);
    await ensureStoredProcedure(pool);
    await ensureEscalatingEnum(pool, 'ale_evento', 'state');
    await ensureEscalatingEnum(pool, 'log_evento_timeline', 'from_state');
    await ensureEscalatingEnum(pool, 'log_evento_timeline', 'to_state');
    console.log('  · Esquema OK (ESCALATING + procedimientos)');
    console.log('  · Datos estáticos intactos — solo se reiniciará el pipeline NVR de alertas');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Error de preflight: ${err.message}`);
  process.exit(1);
});
