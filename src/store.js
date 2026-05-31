const crypto = require('crypto');

const nowIso = () => new Date().toISOString();
const genId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

class Store {
  constructor() {
    this.users = [
      {
        id: 'usr_01',
        tenant_id: 'tn_01',
        email: 'guardia@tenant.cl',
        password: 'secret123',
        role: 'GUARD',
        site_ids: ['st_01'],
      },
    ];
    this.events = new Map();
    this.eventsByIdem = new Map();
    this.timeline = new Map();
  }

  auth(email, password) {
    return this.users.find((u) => u.email === email && u.password === password) || null;
  }

  ingestEvent(idempotencyKey, payloadHash, payload) {
    const idem = this.eventsByIdem.get(idempotencyKey);
    if (idem) {
      if (idem.payloadHash !== payloadHash) {
        return { conflict: true, existing: idem };
      }
      return { deduplicated: true, event: this.events.get(idem.eventId) };
    }

    const eventId = genId('evt');
    const event = {
      event_id: eventId,
      tenant_id: payload.tenant_id,
      site_id: payload.site_id,
      source: payload.source,
      state: 'NEW',
      is_critical: payload.event.severity === 'HIGH' || payload.event.severity === 'CRITICAL',
      event_type: payload.event.event_type,
      severity: payload.event.severity,
      zone_code: payload.event.zone_code || null,
      plate: payload.event.plate || null,
      occurred_at: payload.event.occurred_at,
      evidence: payload.event.evidence || [],
      created_at: nowIso(),
    };
    this.events.set(eventId, event);
    this.eventsByIdem.set(idempotencyKey, { eventId, payloadHash });
    this.timeline.set(eventId, []);
    return { deduplicated: false, event };
  }

  listEvents() {
    return [...this.events.values()].sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
  }

  getEvent(id) {
    return this.events.get(id) || null;
  }

  changeState(eventId, toState, decision, comment, actorUserId) {
    const event = this.getEvent(eventId);
    if (!event) return { notFound: true };

    const transitions = {
      NEW: ['IN_REVIEW'],
      IN_REVIEW: ['CLOSED'],
      CLOSED: [],
    };

    if (!transitions[event.state].includes(toState)) {
      return { invalid: true, fromState: event.state, toState };
    }

    const fromState = event.state;
    event.state = toState;
    const timeline = this.timeline.get(eventId) || [];
    timeline.push({ from_state: fromState, to_state: toState, decision, comment, changed_at: nowIso(), actor_user_id: actorUserId });
    this.timeline.set(eventId, timeline);
    return { event, fromState, changedAt: timeline[timeline.length - 1].changed_at };
  }

  getTimeline(eventId) {
    return this.timeline.get(eventId) || [];
  }
}

module.exports = { Store };