// Parseo del texto de eventos Dahua (HTTP API V3.26).
// Soporta los dos formatos:
//  A) snapManager attachFileProc: "Events[0].Channel=0\nEvents[0].EventBaseInfo.Code=..."
//  B) eventManager attach:        "Code=VideoMotion;action=Start;index=0;data={...}"
//
// ⚠️ Canales (spec §3.5.1): los REQUESTS usan canal desde 1, las RESPUESTAS
// desde 0. Este módulo es el ÚNICO punto de normalización: todo lo que sale
// de aquí usa canal 1-based (igual que la config del conector).

function normalizeChannel(zeroBased) {
  const channel = Number(zeroBased);
  return Number.isFinite(channel) ? channel + 1 : null;
}

// Formato A: agrupa "Events[N].ruta.de.clave=valor" por índice N.
function parseSnapManagerEvents(text) {
  const groups = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^Events\[(\d+)\]\.(.+?)=(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, index, keyPath, value] = match;
    if (!groups.has(index)) groups.set(index, {});
    groups.get(index)[keyPath] = value;
  }

  return [...groups.values()].map(raw => ({
    code: raw['EventBaseInfo.Code'] ?? null,
    action: raw['EventBaseInfo.Action'] ?? null,
    channel: normalizeChannel(raw.Channel ?? raw['EventBaseInfo.Index']),
    pts: raw.PTS ?? null,
    plate: raw['TrafficCar.PlateNumber'] ?? null,
    raw,
  }));
}

// Formato B: pares clave=valor separados por ';' (data= lleva JSON al final).
function parseEventManagerEvent(text) {
  const dataIdx = text.indexOf(';data=');
  let dataJson = null;
  let head = text;
  if (dataIdx !== -1) {
    head = text.slice(0, dataIdx);
    const rawData = text.slice(dataIdx + ';data='.length).trim();
    try {
      dataJson = JSON.parse(rawData);
    } catch {
      dataJson = { unparsed: rawData };
    }
  }

  const fields = {};
  for (const pair of head.split(';')) {
    const sep = pair.indexOf('=');
    if (sep === -1) continue;
    fields[pair.slice(0, sep).trim()] = pair.slice(sep + 1).trim();
  }
  if (!fields.Code) return null;

  return {
    code: fields.Code,
    action: fields.action ?? null,
    channel: normalizeChannel(fields.index),
    pts: null,
    plate: dataJson?.TrafficCar?.PlateNumber ?? null,
    raw: { ...fields, data: dataJson },
  };
}

// Punto de entrada: detecta el formato y devuelve siempre un array de eventos.
function parseEventText(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (/^Events\[\d+\]\./m.test(trimmed)) return parseSnapManagerEvents(trimmed);
  const single = parseEventManagerEvent(trimmed);
  return single ? [single] : [];
}

module.exports = { parseEventText, normalizeChannel };
