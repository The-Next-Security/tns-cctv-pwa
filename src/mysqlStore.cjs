const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/lib/pool.cjs');

// ID CHAR(26): 2 chars de prefijo + 24 hex en mayúscula.
function genId(prefix) {
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 24);
  return (prefix + hex).slice(0, 26).padEnd(26, '0');
}

const SEVERITY_TO_INT = { LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5 };

// La BD ya no tiene roles (solo permisos). El frontend actual sigue siendo
// role-based, asi que el backend deriva una etiqueta `role` SOLO de presentacion:
// 1) por email para usuarios conocidos; 2) si no, a partir del set de permisos.
const EMAIL_TO_APP_ROLE = {
  'admin@agrolivo.cl': 'admin_parque',
  'supervisor@agrolivo.cl': 'supervisor',
  'operador@agrolivo.cl': 'vigilante',
  'recepcionista@agrolivo.cl': 'recepcion',
  'tecnico@agrolivo.cl': 'soporte_tns',
  'andres@thenextsecurity.cl': 'admin_parque',
  'felipe@thenextsecurity.cl': 'admin_parque',
  'raimundo@thenextsecurity.cl': 'admin_parque',
};
function appRole(email, permissions) {
  const fromEmail = EMAIL_TO_APP_ROLE[email?.toLowerCase()];
  if (fromEmail) return fromEmail;
  const p = new Set(permissions || []);
  if (p.has('users.manage') && p.has('config.manage')) return 'admin_parque';
  if (p.has('rules.manage')) return 'responsable_seguridad';
  if (p.has('vehicle_entries.create') && !p.has('alerts.view')) return 'recepcion';
  if (p.has('health.view') && !p.has('alerts.view')) return 'soporte_tns';
  if (p.has('alerts.view')) return 'vigilante';
  return 'visualizador';
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
  if (closeDecision === 'ESCALATED') return 'escalada';
  if (closeDecision === 'FALSE_POSITIVE') return 'descartada';
  return 'resuelta';
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

function mapAlertRow(r) {
  const zoneId = zoneIdFromCode(r.zone_code);
  let ruleId = null;
  try {
    const arr = typeof r.matched_rule_ids_json === 'string' ? JSON.parse(r.matched_rule_ids_json) : r.matched_rule_ids_json;
    if (Array.isArray(arr) && arr.length) ruleId = surrogateId(arr[0]);
  } catch {
    ruleId = null;
  }
  const isoOcc = String(r.occurred_at).replace(' ', 'T') + (String(r.occurred_at).endsWith('Z') ? '' : 'Z');
  return {
    id: surrogateId(r.id_evento),
    event_id: r.id_evento,
    rule_id: ruleId,
    zone_id: zoneId,
    event_type: r.event_type,
    event_code: r.event_type,
    criticality: severityToCriticality(r.severity),
    status: stateToStatus(r.state, r.close_decision),
    timestamp: isoOcc,
    created_at: String(r.creado_en).replace(' ', 'T') + 'Z',
    plate: r.plate,
    description: r.decision_reason || null,
    snapshot_url: null,
    resolution_notes: r.decision_reason || null,
    zone: zoneId ? { id: zoneId, name: ZONE_NAMES[r.zone_code] || r.zone_code, active: true } : undefined,
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

  async auth(email, password) {
    const [rows] = await this.pool.query(
      `SELECT u.id_usuario, u.id_tenant, u.email, u.nombre, u.apellido, u.password_hash, u.status
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
    return {
      id: user.id_usuario,
      tenant_id: user.id_tenant,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      full_name: fullName,
      permissions,
      app_role: appRole(user.email, permissions),
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

      const eventId = genId('EV');
      const sev = SEVERITY_TO_INT[payload.event.severity] ?? 3;
      const critical = sev >= 4 ? 1 : 0;
      await conn.query(
        `INSERT INTO ale_evento
           (id_evento, id_tenant, id_site, id_fuente, external_event_id, event_type, severity,
            zone_code, plate, occurred_at, state, critical, priority, payload_version, raw_payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?)`,
        [
          eventId,
          payload.tenant_id,
          payload.site_id,
          payload.source.source_id,
          payload.event.external_id || null,
          payload.event.event_type,
          sev,
          payload.event.zone_code || null,
          payload.event.plate || null,
          payload.event.occurred_at.replace('T', ' ').replace('Z', ''),
          critical,
          Math.min(sev * 20, 100),
          payload.event.payload_version || '1.0',
          JSON.stringify(payload),
        ]
      );

      await conn.query(
        `INSERT INTO log_evento_timeline
           (id_evento_timeline, id_tenant, id_evento, action_type, to_state, actor_type, occurred_at)
         VALUES (?, ?, ?, 'INGESTED', 'NEW', 'SYSTEM', CURRENT_TIMESTAMP(3))`,
        [genId('TL'), payload.tenant_id, eventId]
      );

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');
      await conn.query(
        `INSERT INTO src_idempotencia_ingesta
           (id_idempotencia_ingesta, id_tenant, endpoint_key, idempotency_key, payload_hash,
            resource_type, resource_id, expires_at)
         VALUES (?, ?, 'ingest_events', ?, ?, 'EVENTO', ?, ?)`,
        [genId('ID'), payload.tenant_id, idempotencyKey, payloadHash, eventId, expires]
      );

      await conn.commit();
      const [ev] = await conn.query(`SELECT * FROM ale_evento WHERE id_evento = ?`, [eventId]);
      return { deduplicated: false, event: mapEventRow(ev[0]) };
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

  async listAlerts() {
    const [rows] = await this.pool.query(
      `SELECT e.*, t.decision AS close_decision
         FROM ale_evento e
         LEFT JOIN (
           SELECT lt.id_evento, lt.decision
             FROM log_evento_timeline lt
             JOIN (
               SELECT id_evento, MAX(occurred_at) mx
                 FROM log_evento_timeline
                WHERE to_state = 'CLOSED'
                GROUP BY id_evento
             ) m ON m.id_evento = lt.id_evento AND m.mx = lt.occurred_at AND lt.to_state = 'CLOSED'
         ) t ON t.id_evento = e.id_evento
        ORDER BY e.occurred_at DESC
        LIMIT 200`
    );
    return rows.map(mapAlertRow);
  }

  async attendAlert(eventId, action, notes, actorUserId) {
    const ACTION_MAP = {
      acknowledge: { toState: 'IN_REVIEW', decision: 'TOMAR' },
      resolve: { toState: 'CLOSED', decision: 'CONFIRMED' },
      escalate: { toState: 'CLOSED', decision: 'ESCALATED' },
      discard: { toState: 'CLOSED', decision: 'FALSE_POSITIVE' },
      // alias del vocabulario del frontend existente
      revisada: { toState: 'CLOSED', decision: 'CONFIRMED' },
      descartada: { toState: 'CLOSED', decision: 'FALSE_POSITIVE' },
      escalada: { toState: 'CLOSED', decision: 'ESCALATED' },
    };
    const target = ACTION_MAP[action];
    if (!target) return { invalid: true, reason: 'UNKNOWN_ACTION' };

    const current = await this.getEvent(eventId);
    if (!current) return { notFound: true };

    const comment = notes || target.decision;

    // Transición multi-paso: el SP solo permite NEW->IN_REVIEW->CLOSED.
    if (target.toState === 'CLOSED' && current.state === 'NEW') {
      const step1 = await this.changeState(eventId, 'IN_REVIEW', 'TOMAR', comment, actorUserId);
      if (step1.notFound || step1.invalid) return step1;
    }
    if (target.toState === 'IN_REVIEW' && current.state !== 'NEW') {
      // ya está en revisión o cerrada: nada que hacer en este paso
      if (current.state === 'IN_REVIEW') return { alert: await this.getAlert(eventId) };
    }

    const res = await this.changeState(eventId, target.toState, target.decision, comment, actorUserId);
    if (res.notFound || res.invalid) return res;
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
    const [rows] = await this.pool.query(
      `SELECT e.*, (
          SELECT lt.decision FROM log_evento_timeline lt
           WHERE lt.id_evento = e.id_evento AND lt.to_state = 'CLOSED'
           ORDER BY lt.occurred_at DESC LIMIT 1
        ) AS close_decision
        FROM ale_evento e WHERE e.id_evento = ?`,
      [eventId]
    );
    return rows[0] ? mapAlertRow(rows[0]) : null;
  }

  async changeState(eventId, toState, decision, comment, actorUserId) {
    const [rows] = await this.pool.query(
      `SELECT id_tenant, state FROM ale_evento WHERE id_evento = ?`,
      [eventId]
    );
    if (!rows[0]) return { notFound: true };
    const fromState = rows[0].state;
    const tenantId = rows[0].id_tenant;

    // Validar actor: el contrato src/ no tiene auth; usamos un ADMIN del tenant si no llega uno válido.
    let actor = actorUserId;
    const [actorRows] = await this.pool.query(
      `SELECT id_usuario FROM gen_usuario WHERE id_usuario = ? AND id_tenant = ?`,
      [actorUserId, tenantId]
    );
    if (!actorRows[0]) {
      const [fallback] = await this.pool.query(
        `SELECT u.id_usuario
           FROM gen_usuario u
           LEFT JOIN gen_usuario_permiso up ON up.id_usuario = u.id_usuario
           LEFT JOIN gen_permiso p ON p.id_permiso = up.id_permiso AND p.code = 'alerts.attend'
          WHERE u.id_tenant = ? AND u.status = 'ACTIVE'
          ORDER BY (p.id_permiso IS NOT NULL) DESC
          LIMIT 1`,
        [tenantId]
      );
      actor = fallback[0]?.id_usuario || null;
    }

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
}

module.exports = { MysqlStore };
