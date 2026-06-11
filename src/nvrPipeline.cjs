const crypto = require('crypto');
const {
  matchRules,
  severityFromRules,
  priorityFromRules,
} = require('./ruleEngine.cjs');

function genId(prefix) {
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase().slice(0, 24);
  return (prefix + hex).slice(0, 26).padEnd(26, '0');
}

function toMysqlDatetime(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 23);
}

/**
 * Persiste un evento crudo del NVR y, si aplica alguna regla activa,
 * crea el registro operativo en ale_evento.
 */
async function processNvrRawEvent(conn, options) {
  const {
    tenantId,
    siteId,
    sourceId,
    channel,
    eventType,
    zoneCode = null,
    plate = null,
    externalId = null,
    occurredAt,
    rawPayload,
    ruleRows,
    action = 'Pulse',
  } = options;

  const occurredMysql = toMysqlDatetime(occurredAt);
  const receivedMysql = toMysqlDatetime(new Date());
  const rawId = genId('DC');

  const payload = rawPayload ?? {
    source: 'NVR_SIMULATION',
    event_code: eventType,
    channel,
    zone_code: zoneCode,
    plate,
    external_id: externalId,
    occurred_at: occurredAt,
  };

  await conn.query(
    `INSERT INTO dah_evento_crudo
       (id_evento_crudo, id_tenant, id_fuente, channel, event_code, action,
        received_at, payload_json, processed, id_evento)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
    [
      rawId,
      tenantId,
      sourceId,
      channel ?? 0,
      eventType,
      action,
      receivedMysql,
      JSON.stringify(payload),
    ]
  );

  const matchedRules = matchRules(ruleRows, {
    event_type: eventType,
    zone_code: zoneCode,
    occurred_at: occurredAt,
  });

  if (!matchedRules.length) {
    await conn.query(
      `UPDATE dah_evento_crudo SET processed = 1 WHERE id_evento_crudo = ?`,
      [rawId]
    );
    return {
      rawId,
      eventId: null,
      matchedRuleIds: [],
      skipped: true,
      reason: 'NO_RULE_MATCH',
    };
  }

  const matchedRuleIds = matchedRules.map((r) => r.id_regla);
  const severity = severityFromRules(matchedRules);
  const priority = priorityFromRules(matchedRules);
  const critical = severity >= 4 ? 1 : 0;
  const eventId = genId('EV');

  const ingestPayload = {
    tenant_id: tenantId,
    site_id: siteId,
    source: { source_id: sourceId, source_type: 'CAMERA', vendor: 'DAHUA' },
    event: {
      external_id: externalId,
      event_type: eventType,
      severity: severity >= 5 ? 'CRITICAL' : severity >= 4 ? 'HIGH' : severity >= 3 ? 'MEDIUM' : 'LOW',
      zone_code: zoneCode,
      plate,
      occurred_at: new Date(occurredAt).toISOString(),
      payload_version: '1.0',
      matched_rule_ids: matchedRuleIds,
      raw_event_id: rawId,
    },
  };

  await conn.query(
    `INSERT INTO ale_evento
       (id_evento, id_tenant, id_site, id_fuente, external_event_id, event_type, severity,
        zone_code, plate, occurred_at, state, critical, priority, payload_version,
        raw_payload_json, matched_rule_ids_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, '1.0', ?, ?)`,
    [
      eventId,
      tenantId,
      siteId,
      sourceId,
      externalId,
      eventType,
      severity,
      zoneCode,
      plate,
      occurredMysql,
      critical,
      priority,
      JSON.stringify(ingestPayload),
      JSON.stringify(matchedRuleIds),
    ]
  );

  await conn.query(
    `INSERT INTO log_evento_timeline
       (id_evento_timeline, id_tenant, id_evento, action_type, to_state, actor_type, occurred_at)
     VALUES (?, ?, ?, 'INGESTED', 'NEW', 'SYSTEM', ?)`,
    [genId('TL'), tenantId, eventId, occurredMysql]
  );

  await conn.query(
    `UPDATE dah_evento_crudo
        SET processed = 1, id_evento = ?
      WHERE id_evento_crudo = ?`,
    [eventId, rawId]
  );

  return {
    rawId,
    eventId,
    matchedRuleIds,
    skipped: false,
    severity,
    priority,
  };
}

module.exports = {
  genId,
  toMysqlDatetime,
  processNvrRawEvent,
};
