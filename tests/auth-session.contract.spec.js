// D10 (PRD-V2): access 60 min + refresh rotativo, sesión máxima 10 h; /auth/me.
const request = require('supertest');
const { createApp } = require('../src/app');

async function login(app) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'guardia@tenant.cl', password: 'secret123' });
  return res.body;
}

describe('Sesión D10: /auth/me + refresh rotativo', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test('login emite access de 60 min y refresh token', async () => {
    const body = await login(app);
    expect(body.expires_in).toBe(3600);
    expect(body.refresh_token).toMatch(/^rft_/);
  });

  test('GET /auth/me devuelve la identidad del JWT', async () => {
    const body = await login(app);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.access_token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: body.user.id,
        email: body.user.email,
        role: body.user.role,
      })
    );
  });

  test('GET /auth/me sin token responde 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('refresh rota el token: emite uno nuevo e invalida el usado', async () => {
    const body = await login(app);

    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: body.refresh_token });
    expect(first.statusCode).toBe(200);
    expect(first.body.refresh_token).toMatch(/^rft_/);
    expect(first.body.refresh_token).not.toBe(body.refresh_token);
    expect(first.body.expires_in).toBe(3600);

    // El refresh token usado queda invalidado (rotativo, un solo uso).
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: body.refresh_token });
    expect(replay.statusCode).toBe(401);

    // El nuevo access token es válido para el API.
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${first.body.access_token}`);
    expect(me.statusCode).toBe(200);
  });

  test('refresh token desconocido responde 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'rft_inexistente' });
    expect(res.statusCode).toBe(401);
  });
});
