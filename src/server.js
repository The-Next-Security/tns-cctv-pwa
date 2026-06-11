const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { createApp } = require('./app');
const { WsHub } = require('./wsHub');
const { resolveJwtSecret } = require('./config');

// Auth WS (Paso 2): el primer frame debe ser { type: 'auth', data: { token } }.
// NO se acepta token en query string (queda en logs de proxies/servidores).
function createServer() {
  const wsAuthTimeoutMs = Number(process.env.WS_AUTH_TIMEOUT_MS || 5000);
  const wsHub = new WsHub();
  const jwtSecret = resolveJwtSecret();
  let store;
  if (process.env.STORE === 'mysql') {
    const { MysqlStore } = require('./mysqlStore.cjs');
    store = new MysqlStore();
    console.log('[store] usando MySQL (tns_cctv)');
  } else {
    console.log('[store] usando store en memoria');
  }
  const app = createApp({ wsHub, store });
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/operations' });

  wss.on('connection', (ws) => {
    const timeout = setTimeout(() => ws.close(4401, 'AUTH_TIMEOUT'), wsAuthTimeoutMs);

    ws.once('message', (raw) => {
      clearTimeout(timeout);
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.close(4400, 'INVALID_JSON');
      }
      if (msg.type !== 'auth' || !msg.data?.token) {
        return ws.close(4401, 'AUTH_REQUIRED');
      }
      let user;
      try {
        user = jwt.verify(msg.data.token, jwtSecret);
      } catch {
        return ws.close(4401, 'INVALID_TOKEN');
      }
      ws.send(JSON.stringify({ type: 'auth.ack', data: { user_id: user.sub } }));
      wsHub.register(ws, user);
    });
  });

  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, () => {
    console.log(`tns-cctv backend listening on :${port}`);
  });
}

module.exports = { createServer };