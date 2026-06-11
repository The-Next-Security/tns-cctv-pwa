// Conexión persistente a un NVR Dahua vía snapManager attachFileProc
// (eventos + snapshot JPEG en un solo stream multipart). Stateless, con
// reconexión por backoff exponencial. HANDOFF §2 Paso 3 / decisión D8.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { MultipartStreamParser, parseBoundary } = require('./multipartParser');
const { parseEventText } = require('./dahuaEvents');
const { parseChallenge, buildAuthorizationHeader } = require('./digestAuth');

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

function buildAttachPath(events) {
  const codes = events.join('%2C');
  // channel=-1: todos los canales. Requests usan canal 1-based (spec §3.5.1).
  return `/cgi-bin/snapManager.cgi?action=attachFileProc&channel=-1&heartbeat=5&Flags[0]=Event&Events=[${codes}]`;
}

function createNvrConnection({ nvr, mapper, ingestClient, snapshotDir, log = console }) {
  let attempts = 0;
  let stopped = false;
  let activeRequest = null;
  let lastHeartbeatSentAt = 0;
  // El stream intercala texto (evento) y JPEG: el snapshot acompaña al último evento.
  let pendingEvents = [];

  const attachPath = buildAttachPath(nvr.events ?? ['VideoMotion', 'CrossLineDetection', 'TrafficJunction']);

  function requestStream(authorization) {
    const options = {
      host: nvr.host,
      port: nvr.port ?? 80,
      path: attachPath,
      method: 'GET',
      headers: authorization ? { Authorization: authorization } : {},
    };

    activeRequest = http.get(options, res => {
      if (res.statusCode === 401 && !authorization) {
        // Flujo Digest RFC 7616: 401 → calcular → reintentar una vez.
        const challenge = parseChallenge(res.headers['www-authenticate']);
        res.resume();
        if (!challenge) return scheduleReconnect('challenge digest ilegible');
        const header = buildAuthorizationHeader({
          username: nvr.username,
          password: nvr.password,
          method: 'GET',
          uri: attachPath,
          challenge,
        });
        return requestStream(header);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return scheduleReconnect(`HTTP ${res.statusCode}`);
      }

      const boundary = parseBoundary(res.headers['content-type']);
      if (!boundary) return scheduleReconnect('sin boundary multipart');

      attempts = 0;
      log.info(`[${nvr.id}] stream conectado (boundary=${boundary})`);
      const parser = new MultipartStreamParser(boundary);

      parser.on('heartbeat', () => {
        log.debug?.(`[${nvr.id}] heartbeat`);
        // M6: reenviar al backend con throttle (el NVR late cada 5 s; basta 1/min).
        const now = Date.now();
        if (now - lastHeartbeatSentAt >= 60_000) {
          lastHeartbeatSentAt = now;
          ingestClient.sendHeartbeat?.(nvr.id);
        }
      });
      parser.on('part', part => handlePart(part).catch(error => {
        log.error(`[${nvr.id}] error procesando part: ${error.message}`);
      }));

      res.on('data', chunk => parser.feed(chunk));
      res.on('end', () => scheduleReconnect('stream cerrado por el NVR'));
      res.on('error', error => scheduleReconnect(error.message));
    });

    activeRequest.on('error', error => scheduleReconnect(error.message));
  }

  async function handlePart({ headers, body }) {
    const contentType = headers['content-type'] ?? '';

    if (contentType.includes('text/plain')) {
      await flushPendingEvents(null); // el evento anterior no traía snapshot
      const occurredAt = new Date().toISOString();
      pendingEvents = parseEventText(body.toString('utf8')).map(event => ({ event, occurredAt }));
      return;
    }

    if (contentType.includes('image/jpeg')) {
      const snapshotUri = persistSnapshot(body);
      await flushPendingEvents(snapshotUri);
    }
  }

  async function flushPendingEvents(snapshotUri) {
    const batch = pendingEvents;
    pendingEvents = [];
    for (const { event, occurredAt } of batch) {
      const mapped = mapper.map(event, { occurredAt, snapshotUri });
      if (!mapped) {
        log.debug?.(`[${nvr.id}] código sin mapping: ${event.code}`);
        continue;
      }
      await ingestClient.send(mapped);
    }
  }

  function persistSnapshot(body) {
    if (!snapshotDir) return null;
    fs.mkdirSync(snapshotDir, { recursive: true });
    const filename = `${nvr.id}-${Date.now()}.jpg`;
    const fullPath = path.join(snapshotDir, filename);
    fs.writeFileSync(fullPath, body);
    return `file://${fullPath}`;
  }

  function scheduleReconnect(reason) {
    if (stopped) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
    attempts += 1;
    log.warn(`[${nvr.id}] desconectado (${reason}); reintento en ${delay} ms`);
    setTimeout(() => {
      if (!stopped) requestStream(null);
    }, delay);
  }

  return {
    start() {
      stopped = false;
      requestStream(null);
    },
    stop() {
      stopped = true;
      activeRequest?.destroy();
    },
  };
}

module.exports = { createNvrConnection, buildAttachPath };
