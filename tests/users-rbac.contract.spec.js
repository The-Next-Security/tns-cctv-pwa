// Test de regresión QA-05 (sesión QA 2026-06-11): autorización por rol.
// Bug real: cualquier usuario autenticado (p. ej. vigilante) podía crear o
// modificar usuarios vía API directa — escalada de privilegios (crear un
// admin_parque). GET /users queda abierto a autenticados porque alimenta los
// contactos de escalación (hooks/use-escalation-users.ts); las MUTACIONES son
// solo admin_parque.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const sign = role => jwt.sign({ sub: 'usr_test', role }, 'dev-secret', { expiresIn: '5m' });

const VALID_USER = {
  nombre: 'QA Test',
  email: 'qa-rbac@agrolivo.cl',
  telefono: '+56900000000',
  role: 'vigilante',
  password: 'password123',
};

describe('Contrato QA-05: RBAC en mutaciones de /users', () => {
  test.each(['vigilante', 'recepcionista', 'supervisor', 'tecnico', 'responsable_seguridad'])(
    "POST /users con rol '%s' → 403",
    async role => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sign(role)}`)
        .send(VALID_USER);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  );

  test("PATCH /users/:id con rol 'vigilante' → 403", async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/v1/users/usr_01')
      .set('Authorization', `Bearer ${sign('vigilante')}`)
      .send(VALID_USER);
    expect(res.statusCode).toBe(403);
  });

  test("POST /users con rol 'admin_parque' pasa el guard (no 403)", async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${sign('admin_parque')}`)
      .send(VALID_USER);
    expect(res.statusCode).not.toBe(403);
  });

  test('GET /users sigue disponible para roles operativos (contactos de escalación)', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${sign('vigilante')}`);
    // El store en memoria responde 501 (sin listUsers); lo que importa es que
    // el guard de rol NO bloquee la lectura (nunca 403).
    expect(res.statusCode).not.toBe(403);
  });
});
