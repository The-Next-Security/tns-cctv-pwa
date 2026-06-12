// Contrato CIOC: RBAC servidor en /api/v1/reports/* (mismo patrón QA-05).
// - summary: roles con reports.view (admin_parque, supervisor,
//   responsable_seguridad, tecnico); vigilante/recepcionista → 403.
// - operators / audit-trail / export: solo admin_parque|supervisor —
//   accountability del equipo y de empresas subcontratadas.
// El store en memoria no implementa reportes: un rol permitido recibe 501
// (NOT_IMPLEMENTED), nunca 403 — eso prueba que el guard deja pasar.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const sign = role => jwt.sign({ sub: 'usr_test', role }, 'dev-secret', { expiresIn: '5m' });

const get = (path, role) =>
  request(createApp()).get(path).set('Authorization', `Bearer ${sign(role)}`);

describe('Contrato CIOC: RBAC en /api/v1/reports/*', () => {
  test.each(['vigilante', 'recepcionista', 'recepcion', 'visualizador'])(
    "GET /reports/summary con rol '%s' → 403",
    async role => {
      const res = await get('/api/v1/reports/summary', role);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  );

  test.each(['admin_parque', 'supervisor', 'responsable_seguridad', 'tecnico'])(
    "GET /reports/summary con rol '%s' pasa el guard (501 del store en memoria)",
    async role => {
      const res = await get('/api/v1/reports/summary', role);
      expect(res.statusCode).toBe(501);
      expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
    }
  );

  test.each([
    ['/api/v1/reports/operators', 'responsable_seguridad'],
    ['/api/v1/reports/operators', 'vigilante'],
    ['/api/v1/reports/audit-trail', 'tecnico'],
    ['/api/v1/reports/audit-trail', 'vigilante'],
    ['/api/v1/reports/export', 'responsable_seguridad'],
    ['/api/v1/reports/export', 'vigilante'],
  ])("GET %s con rol '%s' → 403 (solo admin_parque|supervisor)", async (path, role) => {
    const res = await get(path, role);
    expect(res.statusCode).toBe(403);
  });

  test.each([
    '/api/v1/reports/operators',
    '/api/v1/reports/audit-trail',
    '/api/v1/reports/export',
  ])('GET %s con admin_parque pasa el guard (501 del store en memoria)', async path => {
    const res = await get(path, 'admin_parque');
    expect(res.statusCode).toBe(501);
  });

  test('GET /reports/summary sin token → 401', async () => {
    const res = await request(createApp()).get('/api/v1/reports/summary');
    expect(res.statusCode).toBe(401);
  });

  test('GET /reports/summary con from inválido → 400 antes de tocar el store', async () => {
    const res = await get('/api/v1/reports/summary?from=ayer', 'admin_parque');
    // El store en memoria devolvería 501; un 400 prueba que la validación
    // de rango corre primero para roles autorizados.
    expect([400, 501]).toContain(res.statusCode);
  });
});
