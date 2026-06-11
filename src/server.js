const http = require('http');
const { WebSocketServer } = require('ws');
const { createApp } = require('./app');
const { WsHub } = require('./wsHub');

function createServer() {
  const wsHub = new WsHub();
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
    wsHub.register(ws);
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