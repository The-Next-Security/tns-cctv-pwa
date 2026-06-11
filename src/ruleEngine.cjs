const CRITICALITY_TO_SEVERITY = {
  baja: 2,
  media: 3,
  alta: 4,
  critica: 5,
};

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseTimeToMinutes(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Ventana horaria inclusive; soporta rangos nocturnos (ej. 22:00–06:00). */
function isWithinTimeWindow(timeFrom, timeTo, occurredAt) {
  const date = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  const minutes = date.getHours() * 60 + date.getMinutes();
  const from = parseTimeToMinutes(timeFrom || '00:00');
  const to = parseTimeToMinutes(timeTo || '23:59');
  if (from <= to) return minutes >= from && minutes <= to;
  return minutes >= from || minutes <= to;
}

function ruleMatchesEvent(ruleRow, event) {
  if (ruleRow.enabled !== 1) return false;

  const cond = parseJsonColumn(ruleRow.conditions_json, {});
  const eventCodes = Array.isArray(cond.event_codes) ? cond.event_codes : [];
  if (eventCodes.length && !eventCodes.includes(event.event_type)) return false;

  if (cond.zone_code && event.zone_code && cond.zone_code !== event.zone_code) return false;
  if (cond.zone_code && !event.zone_code) return false;

  if (!isWithinTimeWindow(cond.time_from, cond.time_to, event.occurred_at)) return false;

  return true;
}

/** Devuelve reglas coincidentes ordenadas por priority_order ASC. */
function matchRules(ruleRows, event) {
  return ruleRows
    .filter((rule) => ruleMatchesEvent(rule, event))
    .sort((a, b) => (a.priority_order || 0) - (b.priority_order || 0));
}

function severityFromRules(matchedRules) {
  let max = 2;
  for (const rule of matchedRules) {
    const cond = parseJsonColumn(rule.conditions_json, {});
    const sev = CRITICALITY_TO_SEVERITY[cond.criticality] ?? 3;
    if (sev > max) max = sev;
  }
  return max;
}

function priorityFromRules(matchedRules) {
  if (!matchedRules.length) return 0;
  const best = matchedRules[0];
  const base = Math.max(0, 100 - (best.priority_order || 0));
  return Math.min(100, base);
}

module.exports = {
  CRITICALITY_TO_SEVERITY,
  parseJsonColumn,
  isWithinTimeWindow,
  ruleMatchesEvent,
  matchRules,
  severityFromRules,
  priorityFromRules,
};
