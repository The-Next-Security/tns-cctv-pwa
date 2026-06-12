// GET /api/v1/alerts/:id (HANDOFF §2 Paso 1): handler que repara /operacion/alerta/[id].
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const TOKEN = jwt.sign({ sub: 'usr_test', role: 'GUARD' }, 'dev-secret', { expiresIn: '5m' });

function stubStore(alerts = {}) {
  return {
    resolveEventId: async id => (alerts[id] ? id : null),
    getAlert: async id => alerts[id] ?? null,
  };
}

describe('GET /api/v1/alerts/:id', () => {
  test('devuelve la alerta cuando existe', async () => {
    const alert = { id: 7, event_id: 'evt_07', status: 'pendiente', event_code: 'CrossLineDetection' };
    const app = createApp({ store: stubStore({ evt_07: alert }) });

    const res = await request(app).get('/api/v1/alerts/evt_07').set('Authorization', `Bearer ${TOKEN}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ id: 7, event_id: 'evt_07', status: 'pendiente', request_id: expect.any(String) })
    );
  });

  test('responde 404 si la alerta no existe', async () => {
    const app = createApp({ store: stubStore() });

    const res = await request(app).get('/api/v1/alerts/evt_inexistente').set('Authorization', `Bearer ${TOKEN}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('responde 501 si el store no soporta alertas', async () => {
    const app = createApp({ store: {} });

    const res = await request(app).get('/api/v1/alerts/evt_07').set('Authorization', `Bearer ${TOKEN}`);

    expect(res.statusCode).toBe(501);
  });
});
