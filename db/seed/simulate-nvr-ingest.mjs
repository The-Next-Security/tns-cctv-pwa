/**
 * Simula ingesta desde NVR: dah_evento_crudo → motor de reglas → ale_evento.
 * Reemplaza los INSERT directos de ale_evento en el seed SQL.
 *
 * Uso: node db/seed/simulate-nvr-ingest.mjs
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getPool } = require('../lib/pool.cjs');
const { processNvrRawEvent, genId } = require('../../src/nvrPipeline.cjs');
const { parseJsonColumn, isWithinTimeWindow } = require('../../src/ruleEngine.cjs');

const TENANT_ID = 'TN000000000000000000000001';
const SITE_ID = 'ST000000000000000000000001';

/** Índice 1-based alineado con RG00000000000000000000000N del seed. */
const LIVE_EVENTS = [
  { ruleIndex: 1, event_code: 'CrossLineDetection', minutesAgo: 2, status: 'pendiente' },
  { ruleIndex: 4, minutesAgo: 4, status: 'pendiente', note: 'Peaton sin credencial en torniquete' },
  { ruleIndex: 7, minutesAgo: 5, zone_code: 'zone-5', plate: 'BCDF-12', status: 'pendiente' },
  { ruleIndex: 5, minutesAgo: 8, status: 'pendiente', note: 'Pallet en pasillo de despacho' },
  { ruleIndex: 3, minutesAgo: 10, status: 'pendiente', note: 'Movimiento en bodega fuera de horario' },
  { ruleIndex: 2, minutesAgo: 12, status: 'pendiente', note: 'Deambulacion junto al cerco sur' },
  { ruleIndex: 8, minutesAgo: 15, zone_code: 'zone-2', status: 'pendiente', note: 'Obstruccion parcial de lente' },
  { ruleIndex: 2, minutesAgo: 20, status: 'en_revision', note: 'Guardia verificando en sitio' },
  { ruleIndex: 6, minutesAgo: 45, status: 'resuelta', note: 'Patente BCDF-12 correlacionada con ingreso' },
  { ruleIndex: 2, minutesAgo: 90, status: 'descartada', resolution_notes: 'Falsa alarma — animal silvestre' },
];

const HISTORICAL_EVENTS = [
  { ruleIndex: 1, event_code: 'CrossLineDetection', hour: 5, minute: 40, status: 'resuelta' },
  { ruleIndex: 6, hour: 6, minute: 45, status: 'resuelta' },
  { ruleIndex: 4, hour: 7, minute: 8, status: 'resuelta' },
  { ruleIndex: 7, hour: 8, minute: 5, zone_code: 'zone-5', plate: 'KLMN-34', status: 'resuelta' },
  { ruleIndex: 2, hour: 9, minute: 33, status: 'resuelta' },
  { ruleIndex: 1, event_code: 'CrossLineDetection', hour: 11, minute: 3, status: 'escalada' },
  { ruleIndex: 5, hour: 12, minute: 28, status: 'resuelta' },
  { ruleIndex: 8, hour: 10, minute: 22, zone_code: 'zone-3', status: 'resuelta' },
];

/** Eventos crudos sin regla coincidente (solo quedan en dah_evento_crudo). */
const UNMATCHED_RAW = [
  { event_code: 'VideoMotion', zone_code: 'zone-8', minutesAgo: 3 },
  { event_code: 'StorageLowSpace', zone_code: null, minutesAgo: 7 },
];

function minutesAgoDate(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function pastHourDate(hour, minute = 0) {
  const now = new Date();
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() > now.getTime()) date.setDate(date.getDate() - 1);
  return date;
}

function ruleIdFromIndex(index) {
  return `RG${String(index).padStart(24, '0')}`;
}

function ensureRuleMatchTime(ruleRow, occurredAt) {
  const cond = parseJsonColumn(ruleRow.conditions_json, {});
  if (isWithinTimeWindow(cond.time_from, cond.time_to, occurredAt)) return occurredAt;
  const d = new Date(occurredAt);
  const [fh, fm] = (cond.time_from || '00:00').split(':').map(Number);
  d.setHours(fh || 0, fm || 30, 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d;
}

function resolveEventContext(seed, rules, camerasByZone, rulesById) {
  const rule = rulesById.get(ruleIdFromIndex(seed.ruleIndex));
  if (!rule) throw new Error(`Regla ${seed.ruleIndex} no encontrada en BD`);

  const cond = parseJsonColumn(rule.conditions_json, {});
  const eventType = seed.event_code ?? cond.event_codes?.[0];
  const zoneCode = seed.zone_code ?? cond.zone_code ?? null;
  const camera = camerasByZone.get(zoneCode) ?? [...camerasByZone.values()][0];

  let occurredAt =
    seed.minutesAgo != null
      ? minutesAgoDate(seed.minutesAgo)
      : pastHourDate(seed.hour ?? 12, seed.minute ?? 0);
  occurredAt = ensureRuleMatchTime(rule, occurredAt);

  return { rule, eventType, zoneCode, camera, occurredAt };
}

async function loadContext(conn) {
  const [[tenant]] = await conn.query(`SELECT id_tenant FROM gen_tenant WHERE id_tenant = ?`, [TENANT_ID]);
  if (!tenant) throw new Error('Tenant demo no encontrado. Ejecuta 07_01_datos_iniciales.sql primero.');

  const [cameras] = await conn.query(
    `SELECT id_fuente, source_code, display_name, metadata_json
       FROM src_fuente
      WHERE id_tenant = ? AND source_type = 'CAMERA' AND status = 'ACTIVE'`,
    [TENANT_ID]
  );

  const camerasByZone = new Map();
  for (const cam of cameras) {
    const meta = parseJsonColumn(cam.metadata_json, {});
    if (meta.zone_code) camerasByZone.set(meta.zone_code, { ...cam, meta });
  }

  const [ruleRows] = await conn.query(
    `SELECT id_regla, name, enabled, priority_order, conditions_json, actions_json, timezone
       FROM ale_regla
      WHERE id_tenant = ? AND id_site = ?
      ORDER BY priority_order ASC`,
    [TENANT_ID, SITE_ID]
  );

  const rulesById = new Map(ruleRows.map((r) => [r.id_regla, r]));

  return { camerasByZone, ruleRows, rulesById };
}

async function clearSimulatedData(conn) {
  await conn.query('SET SESSION innodb_lock_wait_timeout = 120');
  // dah_evento_crudo referencia ale_evento: borrar crudos antes que eventos.
  await conn.query(`DELETE FROM log_evento_timeline WHERE id_tenant = ?`, [TENANT_ID]);
  await conn.query(`DELETE FROM dah_evento_crudo WHERE id_tenant = ?`, [TENANT_ID]);
  await conn.query(`DELETE FROM ale_evento WHERE id_tenant = ?`, [TENANT_ID]);
  await conn.query(
    `DELETE FROM src_idempotencia_ingesta WHERE id_tenant = ? AND endpoint_key = 'ingest_events'`,
    [TENANT_ID]
  );
}

async function applyStatus(conn, tenantId, eventId, status, note) {
  const comment = note || status;
  const actor = 'US000000000000000000000001';

  async function change(toState, decision) {
    await conn.query(`CALL stpr_register_event_state(?, ?, ?, 'USER', ?, ?, ?, ?, ?)`, [
      genId('TL'),
      tenantId,
      eventId,
      actor,
      toState,
      decision,
      comment,
      `seed-${crypto.randomBytes(4).toString('hex')}`,
    ]);
  }

  if (status === 'pendiente') return;

  if (status === 'en_revision') {
    await change('IN_REVIEW', 'TOMAR');
    return;
  }

  if (status === 'escalada') {
    await change('IN_REVIEW', 'TOMAR');
    await change('ESCALATING', 'ESCALATED');
    return;
  }

  if (status === 'resuelta') {
    await change('IN_REVIEW', 'TOMAR');
    await change('CLOSED', 'CONFIRMED');
    return;
  }

  if (status === 'descartada') {
    await change('IN_REVIEW', 'TOMAR');
    await change('CLOSED', 'FALSE_POSITIVE');
  }
}

async function ingestSeedEvent(conn, seed, ctx, seq) {
  const { rule, eventType, zoneCode, camera, occurredAt } = resolveEventContext(
    seed,
    ctx.ruleRows,
    ctx.camerasByZone,
    ctx.rulesById
  );

  const result = await processNvrRawEvent(conn, {
    tenantId: TENANT_ID,
    siteId: SITE_ID,
    sourceId: camera.id_fuente,
    channel: camera.meta?.channel ?? 0,
    eventType,
    zoneCode,
    plate: seed.plate ?? null,
    externalId: `nvr-sim-${seq}`,
    occurredAt,
    ruleRows: ctx.ruleRows,
    rawPayload: {
      simulation: true,
      rule_index: seed.ruleIndex,
      note: seed.note ?? seed.resolution_notes ?? null,
    },
  });

  if (!result.eventId) {
    console.warn(`  ⚠ Sin regla para seed #${seq} (${eventType} / ${zoneCode})`);
    return null;
  }

  if (seed.status && seed.status !== 'pendiente') {
    await applyStatus(conn, TENANT_ID, result.eventId, seed.status, seed.resolution_notes || seed.note);
  }

  return result.eventId;
}

async function ingestUnmatchedRaw(conn, seed, ctx, seq) {
  const camera = ctx.camerasByZone.get(seed.zone_code) ?? [...ctx.camerasByZone.values()][0];
  const occurredAt = minutesAgoDate(seed.minutesAgo);

  const result = await processNvrRawEvent(conn, {
    tenantId: TENANT_ID,
    siteId: SITE_ID,
    sourceId: camera.id_fuente,
    channel: camera.meta?.channel ?? 0,
    eventType: seed.event_code,
    zoneCode: seed.zone_code,
    externalId: `nvr-raw-${seq}`,
    occurredAt,
    ruleRows: ctx.ruleRows,
    rawPayload: { simulation: true, unmatched: true },
  });

  return result;
}

async function main() {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    console.log('Limpiando eventos simulados previos…');
    await clearSimulatedData(conn);

    const ctx = await loadContext(conn);
    console.log(`Cámaras: ${ctx.camerasByZone.size} zonas · Reglas: ${ctx.ruleRows.length}`);

    let seq = 1;
    let alerts = 0;

    console.log('\nIngiriendo alertas live (motor de reglas)…');
    for (const seed of LIVE_EVENTS) {
      const id = await ingestSeedEvent(conn, seed, ctx, seq++);
      if (id) alerts += 1;
    }

    console.log('Ingiriendo histórico del día…');
    for (const seed of HISTORICAL_EVENTS) {
      const id = await ingestSeedEvent(conn, seed, ctx, seq++);
      if (id) alerts += 1;
    }

    console.log('Ingiriendo eventos crudos sin regla…');
    let rawOnly = 0;
    for (const seed of UNMATCHED_RAW) {
      const result = await ingestUnmatchedRaw(conn, seed, ctx, seq++);
      if (result.skipped) rawOnly += 1;
    }

    const [[counts]] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM dah_evento_crudo WHERE id_tenant = ?) AS raw_total,
         (SELECT COUNT(*) FROM ale_evento WHERE id_tenant = ?) AS alerts_total,
         (SELECT COUNT(*) FROM dah_evento_crudo WHERE id_tenant = ? AND id_evento IS NULL) AS raw_unmatched`,
      [TENANT_ID, TENANT_ID, TENANT_ID]
    );

    console.log('\n✅ Simulación NVR completada');
    console.log(`   Alertas (ale_evento): ${counts.alerts_total}`);
    console.log(`   Crudos NVR (dah_evento_crudo): ${counts.raw_total}`);
    console.log(`   Crudos sin alerta: ${counts.raw_unmatched}`);
    console.log(`   Procesados en esta corrida: ${alerts} alertas + ${rawOnly} solo crudo`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
