// Checklist de seguridad del hito 25-jun (PRD-V2 §6 / HANDOFF §2 Paso 2):
// API inaccesible sin JWT válido; ingest inaccesible sin API key.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

describe('Seguridad del API (Paso 2)', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test.each([
    ['GET', '/api/v1/events'],
    ['GET', '/api/v1/alerts'],
    ['GET', '/api/v1/users'],
    ['GET', '/api/v1/rules'],
    ['GET', '/api/v1/vehicle-entries'],
  ])('%s %s responde 401 sin token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('rechaza token inválido con 401', async () => {
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', 'Bearer token-falso');
    expect(res.statusCode).toBe(401);
  });

  test('rechaza token expirado con 401', async () => {
    const expired = jwt.sign({ sub: 'usr_x' }, 'dev-secret', { expiresIn: '-1s' });
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.statusCode).toBe(401);
  });

  test('acepta token válido emitido por login', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guardia@tenant.cl', password: 'secret123' });
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${login.body.access_token}`);
    expect(res.statusCode).toBe(200);
  });

  test('/auth/login y /health/* no exigen JWT', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({});
    expect(login.statusCode).not.toBe(401); // 400 por payload, nunca 401

    const health = await request(app).get('/api/v1/health/system');
    expect(health.statusCode).not.toBe(401); // 501 en store memoria, nunca 401
  });

  test('POST /ingest/events responde 401 sin x-api-key', async () => {
    const res = await request(app)
      .post('/api/v1/ingest/events')
      .set('x-idempotency-key', 'idem-sec')
      .send({});
    expect(res.statusCode).toBe(401);
  });

  test('POST /ingest/events responde 401 con api key incorrecta', async () => {
    const res = await request(app)
      .post('/api/v1/ingest/events')
      .set('x-api-key', 'clave-incorrecta')
      .set('x-idempotency-key', 'idem-sec')
      .send({});
    expect(res.statusCode).toBe(401);
  });

  test('el ingest con api key válida NO acepta JWT como reemplazo', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guardia@tenant.cl', password: 'secret123' });
    const res = await request(app)
      .post('/api/v1/ingest/events')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .set('x-idempotency-key', 'idem-sec')
      .send({});
    expect(res.statusCode).toBe(401);
  });
});
