const http = require('http');
const { WebSocketServer } = require('ws');
const { createApp } = require('./app');
const { WsHub } = require('./wsHub');

function createServer() {
  const wsHub = new WsHub();
  const app = createApp({ wsHub });
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