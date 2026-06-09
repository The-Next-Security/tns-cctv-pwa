const { WebSocket } = require('ws');
const { createServer } = require('../src/server');

describe('WS /ws/operations', () => {
  let server;
  let address;

  beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => {
      const listener = server.listen(0, () => {
        address = listener.address();
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('recibe subscribed y event.popup tras ingest', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/operations`);

    await new Promise((resolve, reject) => {
      socket.on('open', async () => {
        socket.send(
          JSON.stringify({
            type: 'subscribe.filters',
            data: { site_ids: ['st_01'], event_states: ['NEW'], critical_only: false },
          }),
        );

        await fetch(`http://127.0.0.1:${address.port}/api/v1/ingest/events`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-idempotency-key': 'idem-ws' },
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
      });

      const seen = new Set();
      socket.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        seen.add(msg.type);
        if (seen.has('subscribed') && seen.has('event.popup')) {
          socket.close();
          resolve();
        }
      });

      socket.on('error', reject);
    });
  });
});
