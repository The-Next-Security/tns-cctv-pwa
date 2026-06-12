const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/lib/pool.cjs');
const { processNvrRawEvent } = require('./nvrPipeline.cjs');

// ID CHAR(26): 2 chars de prefijo + 24 hex en mayúscula.
function genId(prefix) {
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 24);
  return (prefix + hex).slice(0, 26).padEnd(26, '0');
}

const SEVERITY_TO_INT = { LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5 };

// Fallback legacy: inferir rol desde permisos si gen_usuario.rol no existe o está vacío.
const EMAIL_TO_APP_ROLE = {
  'admin@agrolivo.cl': 'admin_parque',
  'supervisor@agrolivo.cl': 'supervisor',
  'operador@agrolivo.cl': 'vigilante',
  'recepcionista@agrolivo.cl': 'recepcionista',
  'tecnico@agrolivo.cl': 'tecnico',
  'seguridad@agrolivo.cl': 'responsable_seguridad',
  'andres@thenextsecurity.cl': 'admin_parque',
  'felipe@thenextsecurity.cl': 'admin_parque',
  'raimundo@thenextsecurity.cl': 'admin_parque',
};

const VALID_APP_ROLES = new Set([
  'admin_parque',
  'supervisor',
  'responsable_seguridad',
  'vigilante',
  'recepcion',
  'recepcionista',
  'tecnico',
  'visualizador',
]);

function normalizeAppRole(role) {
  if (role && VALID_APP_ROLES.has(role)) return role;
  return 'visualizador';
}

function inferAppRoleFromPermissions(email, permissions) {
  const fromEmail = EMAIL_TO_APP_ROLE[email?.toLowerCase()];
  if (fromEmail) return fromEmail;
  const p = new Set(permissions || []);
  if (p.has('users.manage') && p.has('config.manage')) return 'admin_parque';
  if (p.has('rules.manage') && p.has('case_files.resolve')) return 'responsable_seguridad';
  if (p.has('rules.manage') && p.has('health.view')) return 'supervisor';
  if (p.has('vehicle_entries.create') && !p.has('alerts.view')) return 'recepcionista';
  if (p.has('health.view') && !p.has('alerts.view')) return 'tecnico';
  if (p.has('alerts.view') && p.has('vehicle_entries.create')) return 'recepcion';
  if (p.has('alerts.view')) return 'vigilante';
  return 'visualizador';
}

function resolveUserRole(row, permissions) {
  if (row?.rol && VALID_APP_ROLES.has(row.rol)) return row.rol;
  return inferAppRoleFromPermissions(row?.email, permissions);
}

const DEMO_TENANT_ID = 'TN000000000000000000000001';
const DEMO_SITE_ID = 'ST000000000000000000000001';

/** Permisos asignados al crear/editar usuario por rol de presentación. */
const PERMISSIONS_BY_ROLE = {
  admin_parque: [
    'alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view',
    'case_files.view', 'case_files.resolve', 'rules.manage', 'reports.view',
    'users.manage', 'nvrs.manage', 'config.manage', 'health.view',
  ],
  supervisor: [
    'alerts.view', 'alerts.attend', 'vehicle_entries.view', 'case_files.view',
    'case_files.resolve', 'rules.manage', 'reports.view', 'health.view',
  ],
  responsable_seguridad: [
    'alerts.view', 'alerts.attend', 'vehicle_entries.view', 'case_files.view',
    'case_files.resolve', 'rules.manage', 'reports.view',
  ],
  vigilante: ['alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view'],
  recepcion: ['alerts.view', 'alerts.attend', 'vehicle_entries.create', 'vehicle_entries.view'],
  recepcionista: ['vehicle_entries.create', 'vehicle_entries.view', 'case_files.view'],
  tecnico: ['health.view', 'nvrs.manage', 'config.manage', 'reports.view', 'vehicle_entries.view'],
  visualizador: [],
};

function splitDisplayName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombre: 'Usuario', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

function mapUserRow(r, permissions) {
  const role = resolveUserRole(r, permissions);
  return {
    id: r.id_usuario,
    email: r.email,
    telefono: r.telefono ?? null,
    nombre: `${r.nombre} ${r.apellido}`.trim(),
    role,
    rol: role,
    activo: r.status === 'ACTIVE',
    active: r.status === 'ACTIVE',
    ultimaConexion: toIso(r.actualizado_en),
  };
}
function severityToWord(n) {
  if (n >= 5) return 'CRITICAL';
  if (n === 4) return 'HIGH';
  if (n === 3) return 'MEDIUM';
  return 'LOW';
}

const ZONE_NAMES = {
  'zone-1': 'Entrada Principal',
  'zone-2': 'Zona Industrial A',
  'zone-3': 'Zona Industrial B',
  'zone-4': 'Zona Logistica',
  'zone-5': 'Estacionamiento',
  'zone-6': 'Perimetro Norte',
  'zone-7': 'Perimetro Sur',
  'zone-8': 'Area Administrativa',
};

function severityToCriticality(n) {
  if (n >= 5) return 'critica';
  if (n === 4) return 'alta';
  if (n === 3) return 'media';
  return 'baja';
}

function stateToStatus(state, closeDecision) {
  if (state === 'NEW') return 'pendiente';
  if (state === 'IN_REVIEW') return 'en_revision';
  if (state === 'ESCALATING') return 'escalada';
  if (state === 'CLOSED') {
    if (closeDecision === 'FALSE_POSITIVE') return 'descartada';
    return 'resuelta';
  }
  return 'pendiente';
}

// Surrogate numérico estable para Alert.id (la UI usa números como key).
function surrogateId(id) {
  const digits = String(id).replace(/\D/g, '').slice(-9);
  const n = parseInt(digits, 10);
  if (Number.isFinite(n) && n > 0) return n;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000000007;
  return h;
}

function zoneIdFromCode(code) {
  if (!code) return null;
  const m = /(\d+)/.exec(code);
  return m ? parseInt(m[1], 10) : null;
}

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function ruleCodeFromReglaId(idRegla) {
  const match = String(idRegla).match(/(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Regla-${String(n).padStart(4, '0')}`;
}

// ale_regla -> forma `Rule` del frontend (lib/types.ts).
function mapRuleRow(r) {
  const cond = parseJsonColumn(r.conditions_json, {});
  const act = parseJsonColumn(r.actions_json, {});
  const eventCodes = Array.isArray(cond.event_codes) ? cond.event_codes : [];
  return {
    id: surrogateId(r.id_regla),
    rule_id: r.id_regla,
    rule_code: ruleCodeFromReglaId(r.id_regla),
    name: r.name,
    event_codes: eventCodes,
    event_code_pattern: eventCodes.join('|'),
    time_from: cond.time_from ?? null,
    time_to: cond.time_to ?? null,
    criticality: cond.criticality || 'media',
    zone_id: zoneIdFromCode(cond.zone_code),
    priority_popup: !!act.priority_popup,
    notify_push_roles: Array.isArray(act.notify_push_roles)
      ? act.notify_push_roles
      : act.notify_admin
        ? ['responsable_seguridad', 'admin_parque']
        : [],
    notify_admin: Array.isArray(act.notify_push_roles)
      ? act.notify_push_roles.length > 0
      : !!act.notify_admin,
    record_evidence: !!act.record_evidence,
    can_escalate: !!act.can_escalate,
    escalation_roles: Array.isArray(act.escalation_roles) ? act.escalation_roles : [],
    enabled: r.enabled === 1,
    active: r.enabled === 1,
  };
}

// src_fuente -> forma `Camera` del frontend.
function mapSourceRow(r) {
  const meta = parseJsonColumn(r.metadata_json, {});
  return {
    id: surrogateId(r.id_fuente),
    name: r.display_name || r.source_code,
    ip: meta.ip,
    channel: meta.channel,
    zone_id: zoneIdFromCode(meta.zone_code),
    active: r.status === 'ACTIVE',
  };
}

function mapAlertRow(r, maps = {}) {
  const zoneId = zoneIdFromCode(r.zone_code);
  let rule = null;
  try {
    const arr = typeof r.matched_rule_ids_json === 'string' ? JSON.parse(r.matched_rule_ids_json) : r.matched_rule_ids_json;
    if (Array.isArray(arr) && arr.length) rule = maps.rules?.get(arr[0]) ?? { id: surrogateId(arr[0]) };
  } catch {
    rule = null;
  }
  const camera = maps.sources?.get(r.id_fuente) ?? null;
  const isoOcc = String(r.occurred_at).replace(' ', 'T') + (String(r.occurred_at).endsWith('Z') ? '' : 'Z');
  return {
    id: surrogateId(r.id_evento),
    external_event_id: r.external_event_id ?? null,
    event_id: r.id_evento,
    rule_id: rule?.id ?? null,
    rule: rule && rule.name ? rule : undefined,
    camera_id: camera?.id,
    camera: camera || undefined,
    zone_id: zoneId,
    event_type: r.event_type,
    event_code: r.event_type,
    criticality: severityToCriticality(r.severity),
    status: stateToStatus(r.state, r.close_decision),
    timestamp: isoOcc,
    created_at: String(r.creado_en).replace(' ', 'T') + 'Z',
    plate: r.plate,
    description: rule?.name || r.decision_reason || null,
    snapshot_url: null,
    // QA-09 (#50): la nota del operador vive en el comment del último CLOSED
    // del timeline; la decisión del SP (CONFIRMED/DISMISSED) se expone aparte.
    resolution_notes: r.close_comment || null,
    resolution_decision: r.close_decision || null,
    // D4: la llamada vive en el timeline (CALL_REGISTERED), no como columna de ale_evento.
    llamada_at: r.llamada_at ? toIso(r.llamada_at) : null,
    zone: zoneId ? { id: zoneId, name: ZONE_NAMES[r.zone_code] || r.zone_code, active: true } : undefined,
  };
}

function toIso(value) {
  if (!value) return null;
  const s = String(value);
  return s.includes('T') ? s : s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z');
}

// ISO UTC -> 'YYYY-MM-DD HH:MM:SS.mmm' para comparar contra DATETIME(3) (UTC, QA-04).
// Sin from/to se asume la última semana.
function reportRange(from, to) {
  const toIsoSql = (d) => d.toISOString().replace('T', ' ').replace('Z', '');
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw Object.assign(new Error('INVALID_DATE_RANGE'), { code: 'INVALID_DATE_RANGE' });
  }
  return { from: toIsoSql(start), to: toIsoSql(end) };
}

const SOURCE_TYPE_TO_PLATE_SOURCE = { MANUAL: 'manual', ANPR: 'anpr', HYBRID: 'hybrid' };

// adm_ingreso -> forma `VehicleEntry` del frontend.
// vehicle_type / exit_at / anpr_confidence solo existen tras la migración opcional.
function mapIngresoRow(r) {
  return {
    id: surrogateId(r.id_ingreso),
    entry_id: r.id_ingreso,
    plate: r.plate || '',
    plate_normalized: (r.plate || '').replace(/[^A-Z0-9]/gi, '').toUpperCase(),
    declared_driver_name: r.visitor_name || '',
    declared_driver_id: r.visitor_id || null,
    tenant_id: null,
    destination_text: r.destination_company || null,
    vehicle_type: r.vehicle_type ? String(r.vehicle_type).toLowerCase() : null,
    entry_at: toIso(r.entry_at),
    exit_at: r.exit_at ? toIso(r.exit_at) : null,
    registered_by: r.created_by_id_usuario,
    observations: r.notes || null,
    created_at: toIso(r.creado_en),
    plate_source: SOURCE_TYPE_TO_PLATE_SOURCE[r.source_type] || 'manual',
    anpr_confidence: r.anpr_confidence ?? null,
  };
}

function mapEventRow(r) {
  return {
    event_id: r.id_evento,
    tenant_id: r.id_tenant,
    site_id: r.id_site,
    source: { source_id: r.id_fuente },
    state: r.state,
    is_critical: r.critical === 1,
    event_type: r.event_type,
    severity: severityToWord(r.severity),
    zone_code: r.zone_code,
    plate: r.plate,
    occurred_at: r.occurred_at,
    created_at: r.creado_en,
  };
}

class MysqlStore {
  constructor() {
    this.pool = getPool();
  }

  // Detecta columnas opcionales en gen_usuario (migraciones 08_05, 08_06).
  async usuarioExtendedColumns() {
    const [cols] = await this.pool.query(`SHOW COLUMNS FROM gen_usuario`);
    const names = new Set(cols.map((c) => c.Field));
    return { telefono: names.has('telefono'), rol: names.has('rol') };
  }

  async auth(email, password) {
    const usuarioCols = await this.usuarioExtendedColumns();
    const telefonoSelect = usuarioCols.telefono ? 'u.telefono' : 'NULL AS telefono';
    const rolSelect = usuarioCols.rol ? 'u.rol' : 'NULL AS rol';
    const [rows] = await this.pool.query(
      `SELECT u.id_usuario, u.id_tenant, u.email, ${telefonoSelect}, ${rolSelect}, u.nombre, u.apellido, u.password_hash, u.status
         FROM gen_usuario u
        WHERE u.email = ? LIMIT 1`,
      [email]
    );
    const user = rows[0];
    if (!user || user.status !== 'ACTIVE') return null;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;

    const [sites] = await this.pool.query(
      `SELECT id_site FROM gen_acceso_sitio WHERE id_usuario = ?`,
      [user.id_usuario]
    );
    const [perms] = await this.pool.query(
      `SELECT p.code
         FROM gen_usuario_permiso up
         JOIN gen_permiso p ON p.id_permiso = up.id_permiso
        WHERE up.id_usuario = ?`,
      [user.id_usuario]
    );
    const permissions = perms.map((r) => r.code);
    const fullName = `${user.nombre} ${user.apellido}`.trim();
    const role = resolveUserRole(user, permissions);
    return {
      id: user.id_usuario,
      tenant_id: user.id_tenant,
      email: user.email,
      telefono: user.telefono ?? null,
      nombre: user.nombre,
      apellido: user.apellido,
      full_name: fullName,
      permissions,
      role,
      app_role: role,
      site_ids: sites.map((s) => s.id_site),
    };
  }

  async ingestEvent(idempotencyKey, payloadHash, payload) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.query(
        `SELECT resource_id, payload_hash FROM src_idempotencia_ingesta
          WHERE id_tenant = ? AND endpoint_key = 'ingest_events' AND idempotency_key = ?
          FOR UPDATE`,
        [payload.tenant_id, idempotencyKey]
      );
      if (existing[0]) {
        await conn.commit();
        if (existing[0].payload_hash !== payloadHash) {
          return { conflict: true };
        }
        const [ev] = await conn.query(`SELECT * FROM ale_evento WHERE id_evento = ?`, [
          existing[0].resource_id,
        ]);
        return { deduplicated: true, event: mapEventRow(ev[0]) };
      }

      const [ruleRows] = await conn.query(
        `SELECT id_regla, name, enabled, priority_order, conditions_json, actions_json, timezone
           FROM ale_regla
          WHERE id_tenant = ? AND id_site = ?
          ORDER BY priority_order ASC`,
        [payload.tenant_id, payload.site_id]
      );

      const channel =
        payload.event.channel ??
        payload.source.channel ??
        null;

      // El conector puede identificar la fuente por id_fuente o por source_code:
      // dah_evento_crudo exige el id_fuente real (FK), así que se resuelve aquí.
      const [fuenteRows] = await conn.query(
        `SELECT id_fuente FROM src_fuente
          WHERE id_tenant = ? AND (id_fuente = ? OR source_code = ?)
          LIMIT 1`,
        [payload.tenant_id, payload.source.source_id, payload.source.source_id]
      );
      if (!fuenteRows[0]) {
        await conn.rollback();
        return { invalidSource: true };
      }

      const pipelineResult = await processNvrRawEvent(conn, {
        tenantId: payload.tenant_id,
        siteId: payload.site_id,
        sourceId: fuenteRows[0].id_fuente,
        channel,
        eventType: payload.event.event_type,
        zoneCode: payload.event.zone_code || null,
        plate: payload.event.plate || null,
        externalId: payload.event.external_id || null,
        occurredAt: payload.event.occurred_at,
        rawPayload: payload,
        ruleRows,
      });

      const resourceId = pipelineResult.eventId || pipelineResult.rawId;
      const resourceType = pipelineResult.eventId ? 'EVENTO' : 'RAW_NVR';

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');
      await conn.query(
        `INSERT INTO src_idempotencia_ingesta
           (id_idempotencia_ingesta, id_tenant, endpoint_key, idempotency_key, payload_hash,
            resource_type, resource_id, expires_at)
         VALUES (?, ?, 'ingest_events', ?, ?, ?, ?, ?)`,
        [genId('ID'), payload.tenant_id, idempotencyKey, payloadHash, resourceType, resourceId, expires]
      );

      await conn.commit();

      if (!pipelineResult.eventId) {
        return {
          deduplicated: false,
          matched: false,
          status: 'STORED_RAW',
          raw_event_id: pipelineResult.rawId,
          reason: pipelineResult.reason,
        };
      }

      const [ev] = await conn.query(`SELECT * FROM ale_evento WHERE id_evento = ?`, [
        pipelineResult.eventId,
      ]);
      return {
        deduplicated: false,
        matched: true,
        matched_rule_ids: pipelineResult.matchedRuleIds,
        event: mapEventRow(ev[0]),
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async listEvents() {
    const [rows] = await this.pool.query(
      `SELECT * FROM ale_evento ORDER BY occurred_at DESC LIMIT 200`
    );
    return rows.map(mapEventRow);
  }

  async getEvent(id) {
    const [rows] = await this.pool.query(`SELECT * FROM ale_evento WHERE id_evento = ?`, [id]);
    return rows[0] ? mapEventRow(rows[0]) : null;
  }

  async getTimeline(eventId) {
    const [rows] = await this.pool.query(
      `SELECT from_state, to_state, decision, comment_text, occurred_at, actor_id_usuario
         FROM log_evento_timeline
        WHERE id_evento = ? ORDER BY occurred_at ASC`,
      [eventId]
    );
    return rows.map((r) => ({
      from_state: r.from_state,
      to_state: r.to_state,
      decision: r.decision,
      comment: r.comment_text,
      changed_at: r.occurred_at,
      actor_user_id: r.actor_id_usuario,
    }));
  }

  // Mapas de enriquecimiento: reglas y fuentes por id real (CHAR 26).
  async loadEnrichmentMaps() {
    const [[ruleRows], [sourceRows]] = await Promise.all([
      this.pool.query(
        `SELECT id_regla, name, enabled, conditions_json, actions_json FROM ale_regla`
      ),
      this.pool.query(
        `SELECT id_fuente, source_code, display_name, status, metadata_json FROM src_fuente`
      ),
    ]);
    return {
      rules: new Map(ruleRows.map((r) => [r.id_regla, mapRuleRow(r)])),
      sources: new Map(sourceRows.map((r) => [r.id_fuente, mapSourceRow(r)])),
    };
  }

  async listRules() {
    const [rows] = await this.pool.query(
      `SELECT id_regla, name, enabled, conditions_json, actions_json
         FROM ale_regla ORDER BY priority_order ASC`
    );
    return rows.map(mapRuleRow);
  }

  async listUsers({ tenantId = 'TN000000000000000000000001' } = {}) {
    const usuarioCols = await this.usuarioExtendedColumns();
    const telefonoSelect = usuarioCols.telefono ? 'u.telefono' : 'NULL AS telefono';
    const rolSelect = usuarioCols.rol ? 'u.rol' : 'NULL AS rol';
    const [rows] = await this.pool.query(
      `SELECT u.id_usuario, u.email, ${telefonoSelect}, ${rolSelect}, u.nombre, u.apellido, u.status, u.actualizado_en
         FROM gen_usuario u
        WHERE u.id_tenant = ?
        ORDER BY u.nombre, u.apellido`,
      [tenantId]
    );
    const [permRows] = await this.pool.query(
      `SELECT up.id_usuario, p.code
         FROM gen_usuario_permiso up
         JOIN gen_permiso p ON p.id_permiso = up.id_permiso
         JOIN gen_usuario u ON u.id_usuario = up.id_usuario
        WHERE u.id_tenant = ?`,
      [tenantId]
    );
    const permsByUser = new Map();
    for (const row of permRows) {
      if (!permsByUser.has(row.id_usuario)) permsByUser.set(row.id_usuario, []);
      permsByUser.get(row.id_usuario).push(row.code);
    }
    return rows.map((r) => mapUserRow(r, permsByUser.get(r.id_usuario) ?? []));
  }

  async syncRolePermissions(conn, userId, role) {
    const codes = PERMISSIONS_BY_ROLE[role] || [];
    await conn.query(`DELETE FROM gen_usuario_permiso WHERE id_usuario = ?`, [userId]);
    if (!codes.length) return;
    const [permRows] = await conn.query(
      `SELECT id_permiso, code FROM gen_permiso WHERE code IN (${codes.map(() => '?').join(', ')})`,
      codes
    );
    for (const perm of permRows) {
      await conn.query(
        `INSERT INTO gen_usuario_permiso (id_usuario, id_permiso) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE granted_at = granted_at`,
        [userId, perm.id_permiso]
      );
    }
  }

  async createUser(data) {
    const { nombre, apellido } = splitDisplayName(data.nombre || data.full_name);
    const status = data.activo === false || data.active === false ? 'INACTIVE' : 'ACTIVE';
    const role = normalizeAppRole(data.role);
    const userId = genId('US');
    const passwordHash = await bcrypt.hash(String(data.password), 10);
    const usuarioCols = await this.usuarioExtendedColumns();

    const columns = ['id_usuario', 'id_tenant', 'email'];
    const values = [userId, DEMO_TENANT_ID, data.email];
    if (usuarioCols.telefono) {
      columns.push('telefono');
      values.push(data.telefono || null);
    }
    if (usuarioCols.rol) {
      columns.push('rol');
      values.push(role);
    }
    columns.push('nombre', 'apellido', 'password_hash', 'status');
    values.push(nombre, apellido, passwordHash, status);

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO gen_usuario (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values
      );
      if (data.role) await this.syncRolePermissions(conn, userId, role);
      await conn.query(
        `INSERT INTO gen_acceso_sitio (id_usuario, id_site) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id_site = VALUES(id_site)`,
        [userId, DEMO_SITE_ID]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      if (err?.code === 'ER_DUP_ENTRY') {
        return { invalid: true, reason: 'El correo ya está registrado' };
      }
      throw err;
    } finally {
      conn.release();
    }

    const users = await this.listUsers({ tenantId: DEMO_TENANT_ID });
    return { user: users.find((u) => u.id === userId) };
  }

  async updateUser(userId, data) {
    const [existing] = await this.pool.query(
      `SELECT id_usuario FROM gen_usuario WHERE id_usuario = ? AND id_tenant = ? LIMIT 1`,
      [userId, DEMO_TENANT_ID]
    );
    if (!existing[0]) return null;

    const { nombre, apellido } = splitDisplayName(data.nombre || data.full_name);
    const status = data.activo === false || data.active === false ? 'INACTIVE' : 'ACTIVE';
    const role = normalizeAppRole(data.role);
    const usuarioCols = await this.usuarioExtendedColumns();
    const sets = ['email = ?', 'nombre = ?', 'apellido = ?', 'status = ?'];
    const params = [data.email, nombre, apellido, status];

    if (usuarioCols.telefono && data.telefono !== undefined) {
      sets.push('telefono = ?');
      params.push(data.telefono || null);
    }
    if (usuarioCols.rol && data.role) {
      sets.push('rol = ?');
      params.push(role);
    }
    if (data.password) {
      sets.push('password_hash = ?');
      params.push(await bcrypt.hash(String(data.password), 10));
    }
    params.push(userId, DEMO_TENANT_ID);

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE gen_usuario SET ${sets.join(', ')} WHERE id_usuario = ? AND id_tenant = ?`,
        params
      );
      if (data.role) await this.syncRolePermissions(conn, userId, role);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      if (err?.code === 'ER_DUP_ENTRY') {
        return { invalid: true, reason: 'El correo ya está registrado' };
      }
      throw err;
    } finally {
      conn.release();
    }

    const users = await this.listUsers({ tenantId: DEMO_TENANT_ID });
    return { user: users.find((u) => u.id === userId) };
  }

  async listAlerts() {
    const maps = await this.loadEnrichmentMaps();
    const [rows] = await this.pool.query(
      `SELECT e.*, t.decision AS close_decision, t.comment_text AS close_comment, c.llamada_at
         FROM ale_evento e
         LEFT JOIN (
           SELECT lt.id_evento, lt.decision, lt.comment_text
             FROM log_evento_timeline lt
             JOIN (
               SELECT id_evento, MAX(occurred_at) mx
                 FROM log_evento_timeline
                WHERE to_state = 'CLOSED'
                GROUP BY id_evento
             ) m ON m.id_evento = lt.id_evento AND m.mx = lt.occurred_at AND lt.to_state = 'CLOSED'
         ) t ON t.id_evento = e.id_evento
         LEFT JOIN (
           SELECT id_evento, MAX(occurred_at) AS llamada_at
             FROM log_evento_timeline
            WHERE action_type = 'CALL_REGISTERED'
            GROUP BY id_evento
         ) c ON c.id_evento = e.id_evento
        ORDER BY e.occurred_at DESC
        LIMIT 200`
    );
    return rows.map((r) => mapAlertRow(r, maps));
  }

  // --- Ingresos vehiculares (adm_ingreso) ---

  // Detecta una sola vez si la migración opcional (vehicle_type, exit_at,
  // anpr_confidence) fue aplicada; el código funciona en ambos esquemas.
  async ingresoExtendedColumns() {
    if (this._ingresoExtCols === undefined) {
      const [cols] = await this.pool.query(`SHOW COLUMNS FROM adm_ingreso`);
      const names = new Set(cols.map((c) => c.Field));
      this._ingresoExtCols = {
        vehicleType: names.has('vehicle_type'),
        exitAt: names.has('exit_at'),
        anprConfidence: names.has('anpr_confidence'),
      };
    }
    return this._ingresoExtCols;
  }

  async listVehicleEntries({ plate } = {}) {
    const where = ['1=1'];
    const params = [];
    if (plate) {
      where.push(`REPLACE(REPLACE(UPPER(plate), '-', ''), ' ', '') LIKE ?`);
      params.push(`%${String(plate).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}%`);
    }
    const [rows] = await this.pool.query(
      `SELECT * FROM adm_ingreso WHERE ${where.join(' AND ')} ORDER BY entry_at DESC LIMIT 200`,
      params
    );
    return rows.map(mapIngresoRow);
  }

  async getVehicleEntry(ingresoId) {
    const [rows] = await this.pool.query(`SELECT * FROM adm_ingreso WHERE id_ingreso = ?`, [ingresoId]);
    return rows[0] ? mapIngresoRow(rows[0]) : null;
  }

  async resolveIngresoId(idOrSurrogate) {
    const v = String(idOrSurrogate);
    if (!/^\d+$/.test(v)) return v;
    const target = parseInt(v, 10);
    const [rows] = await this.pool.query(`SELECT id_ingreso FROM adm_ingreso`);
    const hit = rows.find((r) => surrogateId(r.id_ingreso) === target);
    return hit ? hit.id_ingreso : null;
  }

  async defaultTenantSite() {
    const [rows] = await this.pool.query(
      `SELECT s.id_tenant, s.id_site FROM gen_site s ORDER BY s.creado_en ASC LIMIT 1`
    );
    return rows[0] || null;
  }

  async resolveActorWithPermission(tenantId, permissionCode, actorUserId) {
    const [actorRows] = await this.pool.query(
      `SELECT id_usuario FROM gen_usuario WHERE id_usuario = ? AND id_tenant = ?`,
      [actorUserId, tenantId]
    );
    if (actorRows[0]) return actorRows[0].id_usuario;
    const [fallback] = await this.pool.query(
      `SELECT u.id_usuario
         FROM gen_usuario u
         LEFT JOIN gen_usuario_permiso up ON up.id_usuario = u.id_usuario
         LEFT JOIN gen_permiso p ON p.id_permiso = up.id_permiso AND p.code = ?
        WHERE u.id_tenant = ? AND u.status = 'ACTIVE'
        ORDER BY (p.id_permiso IS NOT NULL) DESC
        LIMIT 1`,
      [permissionCode, tenantId]
    );
    return fallback[0]?.id_usuario || null;
  }

  async createVehicleEntry(data, actorUserId) {
    const ts = await this.defaultTenantSite();
    if (!ts) return { invalid: true, reason: 'NO_SITE' };
    const actor = await this.resolveActorWithPermission(ts.id_tenant, 'vehicle_entries.create', actorUserId);
    if (!actor) return { invalid: true, reason: 'NO_ACTOR' };

    const ext = await this.ingresoExtendedColumns();
    const id = genId('IG');
    const sourceType =
      { manual: 'MANUAL', anpr: 'ANPR', hybrid: 'HYBRID' }[String(data.plate_source || '').toLowerCase()] || 'MANUAL';
    const entryAt = String(data.entry_at).replace('T', ' ').replace('Z', '');

    const cols = [
      'id_ingreso', 'id_tenant', 'id_site', 'plate', 'visitor_id', 'visitor_name',
      'destination_company', 'source_type', 'entry_at', 'notes', 'review_required', 'created_by_id_usuario',
    ];
    const values = [
      id, ts.id_tenant, ts.id_site, data.plate || null, data.declared_driver_id || null,
      data.declared_driver_name || null, data.destination_text || 'Sin destino declarado',
      sourceType, entryAt, data.observations || null, data.review_required ? 1 : 0, actor,
    ];
    if (ext.vehicleType && data.vehicle_type) {
      cols.push('vehicle_type');
      values.push(String(data.vehicle_type).toUpperCase());
    }
    if (ext.anprConfidence && data.anpr_confidence != null) {
      cols.push('anpr_confidence');
      values.push(data.anpr_confidence);
    }
    await this.pool.query(
      `INSERT INTO adm_ingreso (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      values
    );
    return { entry: await this.getVehicleEntry(id) };
  }

  async updateVehicleEntry(ingresoId, data) {
    const ext = await this.ingresoExtendedColumns();
    const sets = [];
    const params = [];
    if (data.exit_at !== undefined) {
      if (!ext.exitAt) return { unsupported: true, reason: 'EXIT_AT_COLUMN_MISSING' };
      sets.push('exit_at = ?');
      params.push(data.exit_at ? String(data.exit_at).replace('T', ' ').replace('Z', '') : null);
    }
    if (data.observations !== undefined) {
      sets.push('notes = ?');
      params.push(data.observations);
    }
    if (!sets.length) return { invalid: true, reason: 'NO_FIELDS' };
    params.push(ingresoId);
    const [result] = await this.pool.query(
      `UPDATE adm_ingreso SET ${sets.join(', ')} WHERE id_ingreso = ?`,
      params
    );
    if (result.affectedRows === 0) return { notFound: true };
    return { entry: await this.getVehicleEntry(ingresoId) };
  }

  // Auth máquina-a-máquina del ingest (Paso 2): la api key se compara por
  // SHA-256 contra src_conector_edge.api_key_hash (migración 08_08).
  async validateIngestApiKey(apiKey) {
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const [rows] = await this.pool.query(
      `SELECT id_conector_edge, id_tenant, id_site, code
         FROM src_conector_edge
        WHERE api_key_hash = ? AND status = 'ACTIVE'
        LIMIT 1`,
      [hash]
    );
    return rows[0] || null;
  }

  // --- Web Push (D9) ---
  async savePushSubscription(userId, { endpoint, p256dh, auth, userAgent }) {
    const [users] = await this.pool.query(
      `SELECT id_tenant FROM gen_usuario WHERE id_usuario = ? LIMIT 1`,
      [userId]
    );
    if (!users[0]) return { notFound: true };
    await this.pool.query(
      `INSERT INTO ale_push_suscripcion
         (id_push_suscripcion, id_tenant, id_usuario, endpoint, p256dh, auth_secret, user_agent, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         id_usuario = VALUES(id_usuario),
         p256dh = VALUES(p256dh),
         auth_secret = VALUES(auth_secret),
         user_agent = VALUES(user_agent),
         activo = 1`,
      [genId('PS'), users[0].id_tenant, userId, endpoint, p256dh, auth, userAgent || null]
    );
    return { ok: true };
  }

  async listPushSubscriptionsByRoles(tenantId, roles) {
    if (!roles?.length) return [];
    const [rows] = await this.pool.query(
      `SELECT s.endpoint, s.p256dh, s.auth_secret, s.id_usuario
         FROM ale_push_suscripcion s
         JOIN gen_usuario u ON u.id_usuario = s.id_usuario
        WHERE s.activo = 1
          AND s.id_tenant = ?
          AND u.status = 'ACTIVE'
          AND u.rol IN (?)`,
      [tenantId, roles]
    );
    return rows;
  }

  async deactivatePushSubscription(endpoint) {
    await this.pool.query(
      `UPDATE ale_push_suscripcion SET activo = 0 WHERE endpoint = ?`,
      [endpoint]
    );
  }

  async recordPushNotification({ tenantId, eventId, userId, body, status, errorMessage }) {
    let siteId = null;
    if (eventId) {
      const [ev] = await this.pool.query(`SELECT id_site FROM ale_evento WHERE id_evento = ?`, [eventId]);
      siteId = ev[0]?.id_site ?? null;
    }
    if (!siteId) {
      const [sites] = await this.pool.query(`SELECT id_site FROM gen_site WHERE id_tenant = ? LIMIT 1`, [tenantId]);
      siteId = sites[0]?.id_site;
      if (!siteId) return;
    }
    await this.pool.query(
      `INSERT INTO ale_notificacion
         (id_notificacion, id_tenant, id_site, id_evento, channel, target_type, target_value,
          message_body, status, attempts, last_attempt_at, sent_at, error_message)
       VALUES (?, ?, ?, ?, 'PUSH', 'USER', ?, ?, ?, 1, CURRENT_TIMESTAMP(3), ?, ?)`,
      [
        genId('NT'),
        tenantId,
        siteId,
        eventId,
        userId,
        body,
        status,
        status === 'SENT' ? new Date() : null,
        errorMessage,
      ]
    );
  }

  async attendAlert(eventId, action, notes, actorUserId) {
    const ACTION_MAP = {
      acknowledge: { toState: 'IN_REVIEW', decision: 'TOMAR' },
      resolve: { toState: 'CLOSED', decision: 'CONFIRMED' },
      escalate: { toState: 'ESCALATING', decision: 'ESCALATED' },
      discard: { toState: 'CLOSED', decision: 'FALSE_POSITIVE' },
      reactivate: { toState: 'NEW', decision: 'REACTIVATED' },
      activate: { toState: 'NEW', decision: 'REACTIVATED' },
    };
    // D4: registrar llamada NO cambia el estado — solo agrega CALL_REGISTERED al timeline.
    if (action === 'register_call') {
      return this.registerCall(eventId, notes, actorUserId);
    }

    const target = ACTION_MAP[action];
    if (!target) return { invalid: true, reason: 'UNKNOWN_ACTION' };

    const current = await this.getEvent(eventId);
    if (!current) return { notFound: true };

    if (target.toState === 'NEW') {
      return this.reactivateAlert(eventId, notes, actorUserId);
    }

    // QA-13 (#54): sin nota del operador el comment queda NULL — nunca fosilizar
    // el enum de decisión como comment_text (de ahí salía "Resuelta: CONFIRMED").
    const comment = notes || null;

    // Transición multi-paso: el SP solo permite pasos atómicos válidos.
    if (target.toState === 'CLOSED' && current.state === 'NEW') {
      const step1 = await this.changeState(eventId, 'IN_REVIEW', 'TOMAR', comment, actorUserId);
      if (step1.notFound || step1.invalid) return step1;
    }
    if (target.toState === 'IN_REVIEW' && current.state !== 'NEW') {
      if (current.state === 'IN_REVIEW') return { alert: await this.getAlert(eventId) };
    }
    if (target.toState === 'ESCALATING' && current.state === 'ESCALATING') {
      return { alert: await this.getAlert(eventId) };
    }

    const res = await this.changeState(eventId, target.toState, target.decision, comment, actorUserId);
    if (res.notFound || res.invalid) return res;
    return { alert: await this.getAlert(eventId) };
  }

  // D4: llamada_at = acción CALL_REGISTERED en el timeline append-only, NO columna.
  async registerCall(eventId, notes, actorUserId) {
    const [rows] = await this.pool.query(
      `SELECT id_tenant, state FROM ale_evento WHERE id_evento = ?`,
      [eventId]
    );
    if (!rows[0]) return { notFound: true };
    if (rows[0].state === 'CLOSED') return { invalid: true, reason: 'ALERT_CLOSED' };

    const actor = await this.resolveActorWithPermission(rows[0].id_tenant, 'alerts.attend', actorUserId);
    await this.pool.query(
      `INSERT INTO log_evento_timeline (
          id_evento_timeline, id_tenant, id_evento, action_type,
          from_state, to_state, decision, comment_text,
          actor_type, actor_id_usuario, occurred_at, request_id
        ) VALUES (?, ?, ?, 'CALL_REGISTERED', NULL, NULL, NULL, ?, 'USER', ?, CURRENT_TIMESTAMP(3), NULL)`,
      [genId('TL'), rows[0].id_tenant, eventId, notes || 'Llamada registrada', actor]
    );
    return { alert: await this.getAlert(eventId) };
  }

  async reactivateAlert(eventId, notes, actorUserId) {
    const [rows] = await this.pool.query(
      `SELECT id_tenant, state FROM ale_evento WHERE id_evento = ?`,
      [eventId]
    );
    if (!rows[0]) return { notFound: true };

    const { id_tenant: tenantId, state: fromState } = rows[0];
    if (fromState === 'NEW') return { alert: await this.getAlert(eventId) };
    if (fromState !== 'CLOSED') return { invalid: true, reason: 'NOT_CLOSED' };

    const actor = await this.resolveActorWithPermission(tenantId, 'alerts.attend', actorUserId);
    const comment = notes || 'Alerta reactivada';

    // Intentar vía SP (instalaciones con 08_07 / SP actualizado); si falla, fallback directo.
    const spResult = await this.changeState(eventId, 'NEW', 'REACTIVATED', comment, actorUserId);
    if (!spResult.invalid) {
      return { alert: await this.getAlert(eventId) };
    }

    await this.pool.query(
      `UPDATE ale_evento
          SET state = 'NEW',
              decision_reason = NULL,
              actualizado_en = CURRENT_TIMESTAMP(3)
        WHERE id_evento = ?
          AND id_tenant = ?`,
      [eventId, tenantId]
    );
    await this.pool.query(
      `INSERT INTO log_evento_timeline (
          id_evento_timeline,
          id_tenant,
          id_evento,
          action_type,
          from_state,
          to_state,
          decision,
          comment_text,
          actor_type,
          actor_id_usuario,
          occurred_at,
          request_id
        ) VALUES (?, ?, ?, 'STATE_CHANGE', 'CLOSED', 'NEW', 'REACTIVATED', ?, 'USER', ?, CURRENT_TIMESTAMP(3), NULL)`,
      [genId('TL'), tenantId, eventId, comment, actor]
    );
    return { alert: await this.getAlert(eventId) };
  }

  // Resuelve un id_evento real a partir del CHAR(26) o de un surrogate numérico de la UI.
  async resolveEventId(idOrSurrogate) {
    const v = String(idOrSurrogate);
    if (!/^\d+$/.test(v)) return v;
    const target = parseInt(v, 10);
    const [rows] = await this.pool.query(`SELECT id_evento FROM ale_evento`);
    const hit = rows.find((r) => surrogateId(r.id_evento) === target);
    return hit ? hit.id_evento : null;
  }

  async getAlert(eventId) {
    const maps = await this.loadEnrichmentMaps();
    const [rows] = await this.pool.query(
      `SELECT e.*, (
          SELECT lt.decision FROM log_evento_timeline lt
           WHERE lt.id_evento = e.id_evento AND lt.to_state = 'CLOSED'
           ORDER BY lt.occurred_at DESC LIMIT 1
        ) AS close_decision, (
          SELECT lt.comment_text FROM log_evento_timeline lt
           WHERE lt.id_evento = e.id_evento AND lt.to_state = 'CLOSED'
           ORDER BY lt.occurred_at DESC LIMIT 1
        ) AS close_comment, (
          SELECT MAX(lt.occurred_at) FROM log_evento_timeline lt
           WHERE lt.id_evento = e.id_evento AND lt.action_type = 'CALL_REGISTERED'
        ) AS llamada_at
        FROM ale_evento e WHERE e.id_evento = ?`,
      [eventId]
    );
    return rows[0] ? mapAlertRow(rows[0], maps) : null;
  }

  async changeState(eventId, toState, decision, comment, actorUserId) {
    const [rows] = await this.pool.query(
      `SELECT id_tenant, state FROM ale_evento WHERE id_evento = ?`,
      [eventId]
    );
    if (!rows[0]) return { notFound: true };
    const fromState = rows[0].state;
    const tenantId = rows[0].id_tenant;

    // Validar actor: el contrato src/ no tiene auth; usamos un usuario con permiso del tenant si no llega uno válido.
    const actor = await this.resolveActorWithPermission(tenantId, 'alerts.attend', actorUserId);

    try {
      await this.pool.query(`CALL stpr_register_event_state(?, ?, ?, 'USER', ?, ?, ?, ?, ?)`, [
        genId('TL'),
        tenantId,
        eventId,
        actor,
        toState,
        decision,
        comment,
        null,
      ]);
    } catch (err) {
      if (/INVALID_EVENT_STATE_TRANSITION/.test(err.message)) {
        return { invalid: true, fromState, toState };
      }
      throw err;
    }
    return { fromState, changedAt: new Date().toISOString() };
  }

  // Salud del sistema: ping a MySQL. No hay Redis ni cola en este stack local,
  // por lo que se reportan valores nominales para cumplir el contrato `SystemHealth`.
  async systemHealth() {
    let db = 'ok';
    try {
      await this.pool.query('SELECT 1');
    } catch {
      db = 'down';
    }
    return {
      db,
      redis: 'ok',
      queue_depth: 0,
      uptime_seconds: Math.floor(process.uptime()),
    };
  }

  // Lee un parámetro de gen_configuracion_* (valor activo o valor_default).
  async getConfigValue(rutaCompleta, fallback) {
    const [rows] = await this.pool.query(
      `SELECT COALESCE(v.valor, p.valor_default) AS valor
         FROM gen_configuracion_parametros p
         LEFT JOIN gen_configuracion_valores v
           ON v.id_configuracion_parametros = p.id_configuracion_parametros AND v.activo = 1
        WHERE p.ruta_completa = ? AND p.activo = 1
        ORDER BY v.version DESC
        LIMIT 1`,
      [rutaCompleta]
    );
    return rows[0]?.valor ?? fallback;
  }

  // M6: heartbeat de una fuente (lo reporta el conector o el ingest de eventos).
  async recordSourceHeartbeat(sourceCodeOrId) {
    const [result] = await this.pool.query(
      `UPDATE src_fuente
          SET last_heartbeat_at = CURRENT_TIMESTAMP(3)
        WHERE source_code = ? OR id_fuente = ?`,
      [sourceCodeOrId, sourceCodeOrId]
    );
    return { updated: result.affectedRows > 0 };
  }

  // --- Reportes (CIOC): agregaciones sobre ale_evento + log_evento_timeline ---
  // from/to llegan como ISO UTC; occurred_at se guarda en UTC (QA-04).

  // KPIs + series para la página /reportes en una sola llamada.
  async reportSummary({ from, to }) {
    const range = reportRange(from, to);
    const params = [range.from, range.to];

    // Subconsultas del timeline: primera toma (IN_REVIEW) y último cierre por evento.
    const ackJoin = `
      LEFT JOIN (
        SELECT id_evento, MIN(occurred_at) AS ack_at
          FROM log_evento_timeline
         WHERE to_state = 'IN_REVIEW'
         GROUP BY id_evento
      ) a ON a.id_evento = e.id_evento`;
    const closeJoin = `
      LEFT JOIN (
        SELECT lt.id_evento, lt.decision, lt.occurred_at AS closed_at
          FROM log_evento_timeline lt
          JOIN (
            SELECT id_evento, MAX(occurred_at) mx
              FROM log_evento_timeline
             WHERE to_state = 'CLOSED'
             GROUP BY id_evento
          ) m ON m.id_evento = lt.id_evento AND m.mx = lt.occurred_at AND lt.to_state = 'CLOSED'
      ) c ON c.id_evento = e.id_evento`;

    const [[kpiRows], [zoneRows], [sevRows], [dayRows], [typeRows], [hourRows]] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*) AS total,
                SUM(e.state = 'CLOSED' AND c.decision = 'CONFIRMED') AS resueltas,
                SUM(e.state = 'CLOSED' AND c.decision = 'FALSE_POSITIVE') AS descartadas,
                SUM(e.state IN ('NEW', 'IN_REVIEW')) AS pendientes,
                SUM(e.state = 'ESCALATING') AS escaladas,
                SUM(e.severity >= 5) AS criticas,
                AVG(CASE WHEN a.ack_at IS NOT NULL
                         THEN TIMESTAMPDIFF(SECOND, e.occurred_at, a.ack_at) END) AS avg_ack_s,
                AVG(CASE WHEN c.closed_at IS NOT NULL
                         THEN TIMESTAMPDIFF(SECOND, e.occurred_at, c.closed_at) END) AS avg_resolucion_s
           FROM ale_evento e ${ackJoin} ${closeJoin}
          WHERE e.occurred_at >= ? AND e.occurred_at < ?`,
        params
      ),
      this.pool.query(
        `SELECT COALESCE(e.zone_code, 'sin_zona') AS zone_code, COUNT(*) AS total
           FROM ale_evento e
          WHERE e.occurred_at >= ? AND e.occurred_at < ?
          GROUP BY zone_code ORDER BY total DESC`,
        params
      ),
      this.pool.query(
        `SELECT e.severity, COUNT(*) AS total
           FROM ale_evento e
          WHERE e.occurred_at >= ? AND e.occurred_at < ?
          GROUP BY e.severity`,
        params
      ),
      this.pool.query(
        `SELECT DATE(e.occurred_at) AS dia, COUNT(*) AS total
           FROM ale_evento e
          WHERE e.occurred_at >= ? AND e.occurred_at < ?
          GROUP BY dia ORDER BY dia ASC`,
        params
      ),
      this.pool.query(
        `SELECT e.event_type,
                SUM(e.state = 'CLOSED') AS resueltas,
                SUM(e.state <> 'CLOSED') AS pendientes
           FROM ale_evento e
          WHERE e.occurred_at >= ? AND e.occurred_at < ?
          GROUP BY e.event_type ORDER BY (resueltas + pendientes) DESC LIMIT 10`,
        params
      ),
      this.pool.query(
        `SELECT FLOOR(HOUR(e.occurred_at) / 4) * 4 AS hora_bloque,
                AVG(TIMESTAMPDIFF(SECOND, e.occurred_at, a.ack_at)) AS avg_ack_s
           FROM ale_evento e
           JOIN (
             SELECT id_evento, MIN(occurred_at) AS ack_at
               FROM log_evento_timeline
              WHERE to_state = 'IN_REVIEW'
              GROUP BY id_evento
           ) a ON a.id_evento = e.id_evento
          WHERE e.occurred_at >= ? AND e.occurred_at < ?
          GROUP BY hora_bloque ORDER BY hora_bloque ASC`,
        params
      ),
    ]);

    const k = kpiRows[0] || {};
    const total = Number(k.total || 0);
    const resueltas = Number(k.resueltas || 0);
    const descartadas = Number(k.descartadas || 0);
    return {
      range: { from, to },
      kpis: {
        total,
        resueltas,
        descartadas,
        pendientes: Number(k.pendientes || 0),
        escaladas: Number(k.escaladas || 0),
        criticas: Number(k.criticas || 0),
        tasa_resolucion: total ? Math.round(((resueltas + descartadas) / total) * 100) : 0,
        tasa_falsos_positivos: resueltas + descartadas
          ? Math.round((descartadas / (resueltas + descartadas)) * 100)
          : 0,
        tiempo_toma_promedio_s: k.avg_ack_s != null ? Math.round(Number(k.avg_ack_s)) : null,
        tiempo_resolucion_promedio_s: k.avg_resolucion_s != null ? Math.round(Number(k.avg_resolucion_s)) : null,
      },
      alertas_por_zona: zoneRows.map((r) => ({
        zona: ZONE_NAMES[r.zone_code] || r.zone_code,
        alertas: Number(r.total),
      })),
      distribucion_criticidad: sevRows.map((r) => ({
        criticidad: severityToCriticality(r.severity),
        total: Number(r.total),
      })),
      incidentes_por_dia: dayRows.map((r) => ({
        dia: String(r.dia instanceof Date ? r.dia.toISOString().slice(0, 10) : r.dia).slice(0, 10),
        total: Number(r.total),
      })),
      resolucion_por_tipo: typeRows.map((r) => ({
        tipo: r.event_type,
        resueltas: Number(r.resueltas || 0),
        pendientes: Number(r.pendientes || 0),
      })),
      tiempo_respuesta_por_hora: hourRows.map((r) => ({
        hora: `${String(r.hora_bloque).padStart(2, '0')}:00`,
        promedio: r.avg_ack_s != null ? Math.round(Number(r.avg_ack_s)) : null,
      })),
    };
  }

  // Accountability: actividad operativa por usuario (acciones del timeline).
  async reportOperators({ from, to }) {
    const range = reportRange(from, to);
    const [rows] = await this.pool.query(
      `SELECT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS nombre, u.rol,
              COUNT(*) AS acciones,
              SUM(lt.to_state = 'IN_REVIEW') AS tomadas,
              SUM(lt.to_state = 'CLOSED' AND lt.decision = 'CONFIRMED') AS resueltas,
              SUM(lt.to_state = 'CLOSED' AND lt.decision = 'FALSE_POSITIVE') AS descartadas,
              SUM(lt.to_state = 'ESCALATING') AS escaladas,
              SUM(lt.action_type = 'CALL_REGISTERED') AS llamadas,
              AVG(CASE WHEN lt.to_state = 'IN_REVIEW'
                       THEN TIMESTAMPDIFF(SECOND, e.occurred_at, lt.occurred_at) END) AS avg_toma_s
         FROM log_evento_timeline lt
         JOIN gen_usuario u ON u.id_usuario = lt.actor_id_usuario
         JOIN ale_evento e ON e.id_evento = lt.id_evento
        WHERE lt.actor_type = 'USER'
          AND lt.occurred_at >= ? AND lt.occurred_at < ?
        GROUP BY u.id_usuario, nombre, u.rol
        ORDER BY acciones DESC`,
      [range.from, range.to]
    );
    return rows.map((r) => ({
      user_id: r.id_usuario,
      nombre: r.nombre,
      rol: r.rol,
      acciones: Number(r.acciones),
      tomadas: Number(r.tomadas || 0),
      resueltas: Number(r.resueltas || 0),
      descartadas: Number(r.descartadas || 0),
      escaladas: Number(r.escaladas || 0),
      llamadas: Number(r.llamadas || 0),
      tiempo_toma_promedio_s: r.avg_toma_s != null ? Math.round(Number(r.avg_toma_s)) : null,
    }));
  }

  // Pista de auditoría unificada: timeline operativo + auditoría administrativa.
  async reportAuditTrail({ from, to, userId, page = 1, pageSize = 25 } = {}) {
    const range = reportRange(from, to);
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
    const userFilterOp = userId ? 'AND lt.actor_id_usuario = ?' : '';
    const userFilterAdm = userId ? 'AND la.id_usuario = ?' : '';
    const params = [
      range.from, range.to, ...(userId ? [userId] : []),
      range.from, range.to, ...(userId ? [userId] : []),
    ];

    const baseUnion = `
      SELECT 'OPERACION' AS categoria, lt.occurred_at AS ts,
             CONCAT(u.nombre, ' ', u.apellido) AS actor, u.rol AS actor_rol,
             lt.action_type AS accion, lt.from_state, lt.to_state, lt.decision,
             lt.comment_text AS detalle, e.event_type AS recurso, lt.id_evento AS recurso_id
        FROM log_evento_timeline lt
        LEFT JOIN gen_usuario u ON u.id_usuario = lt.actor_id_usuario
        JOIN ale_evento e ON e.id_evento = lt.id_evento
       WHERE lt.occurred_at >= ? AND lt.occurred_at < ? ${userFilterOp}
      UNION ALL
      SELECT 'ADMIN' AS categoria, la.creado_en AS ts,
             CONCAT(u.nombre, ' ', u.apellido) AS actor, la.actor_role AS actor_rol,
             la.action AS accion, NULL, NULL, NULL,
             NULL AS detalle, la.resource_type AS recurso, la.resource_id AS recurso_id
        FROM log_auditoria_api la
        LEFT JOIN gen_usuario u ON u.id_usuario = la.id_usuario
       WHERE la.creado_en >= ? AND la.creado_en < ? ${userFilterAdm}`;

    const [[countRows], [rows]] = await Promise.all([
      this.pool.query(`SELECT COUNT(*) AS total FROM (${baseUnion}) x`, params),
      this.pool.query(
        `SELECT * FROM (${baseUnion}) x ORDER BY ts DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
    ]);

    return {
      total: Number(countRows[0]?.total || 0),
      page: Math.floor(offset / limit) + 1,
      page_size: limit,
      items: rows.map((r) => ({
        categoria: r.categoria,
        occurred_at: toIso(r.ts),
        actor: r.actor || 'Sistema',
        actor_rol: r.actor_rol || null,
        accion: r.accion,
        from_state: r.from_state,
        to_state: r.to_state,
        decision: r.decision,
        detalle: r.detalle,
        recurso: r.recurso,
        recurso_id: r.recurso_id,
      })),
    };
  }

  // src_fuente (NVR) -> forma `NvrHealth` del frontend.
  // M6: estado según antigüedad del heartbeat con umbrales configurables
  // (heartbeat ≤5 min OK; sin señal > umbral (15 min default) = incidente/down).
  async listNvrHealth() {
    const started = Date.now();
    const heartbeatMaxS = Number(await this.getConfigValue('health.nvr_heartbeat_max_s', '300'));
    const incidentMin = Number(await this.getConfigValue('health.incident_threshold_min', '15'));

    const [nvrs] = await this.pool.query(
      `SELECT id_fuente, source_code, display_name, status, actualizado_en, last_heartbeat_at,
              TIMESTAMPDIFF(SECOND, COALESCE(last_heartbeat_at, actualizado_en), CURRENT_TIMESTAMP(3)) AS heartbeat_age_s
       FROM src_fuente
       WHERE source_type = 'NVR'
       ORDER BY source_code`
    );
    const [cams] = await this.pool.query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.nvr_code')) AS nvr_code,
              COUNT(*) AS total
       FROM src_fuente
       WHERE source_type = 'CAMERA' AND status = 'ACTIVE'
       GROUP BY nvr_code`
    );
    const latencyMs = Date.now() - started;
    const camerasByNvr = new Map(cams.map((c) => [c.nvr_code, Number(c.total)]));

    return nvrs.map((r) => {
      let status = 'ok';
      if (r.status !== 'ACTIVE') {
        status = 'down';
      } else if (r.last_heartbeat_at !== null) {
        // Solo se evalúa antigüedad cuando la fuente ya reporta heartbeats reales.
        const ageS = Number(r.heartbeat_age_s ?? 0);
        if (ageS > incidentMin * 60) status = 'down';
        else if (ageS > heartbeatMaxS) status = 'degraded';
      }
      return {
        id: surrogateId(r.id_fuente),
        code: r.display_name || r.source_code,
        status,
        last_check: toIso(r.last_heartbeat_at || r.actualizado_en),
        latency_ms: latencyMs,
        connected_cameras: camerasByNvr.get(r.source_code) || 0,
      };
    });
  }
}

// mapAlertRow se exporta para los tests de contrato (QA-09 #50).
module.exports = { MysqlStore, mapAlertRow };
