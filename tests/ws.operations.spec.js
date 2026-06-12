const { WebSocket } = require('ws');
const { createServer } = require('../src/server');

const INGEST_API_KEY = 'dev-ingest-key';

describe('WS /ws/operations', () => {
  let server;
  let address;

  beforeAll(async () => {
    process.env.WS_AUTH_TIMEOUT_MS = '300';
    server = createServer();
    await new Promise((resolve) => {
      const listener = server.listen(0, () => {
        address = listener.address();
        resolve();
      });
    });
  });

  afterAll(async () => {
    delete process.env.WS_AUTH_TIMEOUT_MS;
    await new Promise((resolve) => server.close(resolve));
  });

  async function loginToken() {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'guardia@tenant.cl', password: 'secret123' }),
    });
    const body = await res.json();
    return body.access_token;
  }

  test('autentica, recibe subscribed y event.popup tras ingest', async () => {
    const token = await loginToken();
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/operations`);

    await new Promise((resolve, reject) => {
      socket.on('open', () => {
        // Primer frame obligatorio: auth (Paso 2). Nunca token en query string.
        socket.send(JSON.stringify({ type: 'auth', data: { token } }));
      });

      const seen = new Set();
      socket.on('message', async (raw) => {
        const msg = JSON.parse(raw.toString());
        seen.add(msg.type);

        if (msg.type === 'auth.ack') {
          socket.send(
            JSON.stringify({
              type: 'subscribe.filters',
              data: { site_ids: ['st_01'], event_states: ['NEW'], critical_only: false },
            }),
          );

          await fetch(`http://127.0.0.1:${address.port}/api/v1/ingest/events`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-idempotency-key': 'idem-ws',
              'x-api-key': INGEST_API_KEY,
            },
            body: JSON.stringify({
              tenant_id: 'tn_01',
              site_id: 'st_01',
              source: { source_id: 'src_nvr1', source_type: 'NVR', vendor: 'DAHUA' },
              event: {
                external_id: 'ws_evt',
                event_type: 'PERIMETER_INTRUSION',
                severity: 'HIGH',
                occurred_at: '2026-05-28T19:02:00Z',
                payload_version: '1.0',
                evidence: [],
              },
            }),
          });
        }

        if (seen.has('subscribed') && seen.has('event.popup')) {
          socket.close();
          resolve();
        }
      });

      socket.on('error', reject);
    });
  });

  test('cierra la conexión con 4401 si el token es inválido', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/operations`);

    const code = await new Promise((resolve, reject) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'auth', data: { token: 'token-falso' } }));
      });
      socket.on('close', (closeCode) => resolve(closeCode));
      socket.on('error', reject);
    });

    expect(code).toBe(4401);
  });

  test('cierra la conexión con 4401 si el primer frame no es auth', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/operations`);

    const code = await new Promise((resolve, reject) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'subscribe.filters', data: {} }));
      });
      socket.on('close', (closeCode) => resolve(closeCode));
      socket.on('error', reject);
    });

    expect(code).toBe(4401);
  });

  test('cierra la conexión por timeout si nunca se autentica', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/operations`);

    const code = await new Promise((resolve, reject) => {
      socket.on('close', (closeCode) => resolve(closeCode));
      socket.on('error', reject);
    });

    expect(code).toBe(4401);
  });
});
