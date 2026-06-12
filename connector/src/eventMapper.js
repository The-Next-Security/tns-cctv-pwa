// Mapea eventos Dahua normalizados al contrato POST /api/v1/ingest/events.
// mapping.json define código Dahua → { event_type, severity } (D8).
const crypto = require('crypto');

// Idempotency-key = hash(nvr_id, channel, code, PTS) según HANDOFF §2 Paso 3.
// Sin PTS (eventManager) se usa occurred_at truncado a segundos como sustituto.
function buildIdempotencyKey({ nvrId, channel, code, pts, occurredAt }) {
  const discriminator = pts ?? (occurredAt ? occurredAt.slice(0, 19) : '');
  return crypto
    .createHash('sha256')
    .update(`${nvrId}|${channel ?? ''}|${code}|${discriminator}`)
    .digest('hex');
}

function createEventMapper({ mapping, nvr, tenantId, siteId }) {
  if (!mapping || typeof mapping !== 'object') throw new Error('mapping.json requerido');
  if (!nvr?.id) throw new Error('nvr.id requerido');

  function map(dahuaEvent, { occurredAt = new Date().toISOString(), snapshotUri = null } = {}) {
    const rule = mapping[dahuaEvent.code];
    if (!rule) return null; // código no mapeado: se ignora (queda en log del caller)

    const zoneCode = nvr.channelZones?.[String(dahuaEvent.channel)] ?? null;
    const evidence = snapshotUri ? [{ type: 'SNAPSHOT', uri: snapshotUri }] : [];

    return {
      idempotencyKey: buildIdempotencyKey({
        nvrId: nvr.id,
        channel: dahuaEvent.channel,
        code: dahuaEvent.code,
        pts: dahuaEvent.pts,
        occurredAt,
      }),
      payload: {
        tenant_id: tenantId,
        site_id: siteId,
        source: { source_id: nvr.id, source_type: 'NVR', vendor: 'DAHUA' },
        event: {
          external_id: `${nvr.id}-ch${dahuaEvent.channel ?? 0}-${dahuaEvent.pts ?? occurredAt}`,
          event_type: rule.event_type,
          severity: rule.severity,
          ...(zoneCode ? { zone_code: zoneCode } : {}),
          ...(dahuaEvent.plate ? { plate: dahuaEvent.plate } : {}),
          occurred_at: occurredAt,
          evidence,
          payload_version: '1.0',
        },
      },
    };
  }

  return { map };
}

module.exports = { createEventMapper, buildIdempotencyKey };
