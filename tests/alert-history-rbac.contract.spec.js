// Contrato D12: ciclo de vida de alertas en GET /api/v1/alerts.
// - scope=historial (búsqueda forense) exige supervisor+: el guard corre ANTES
//   de la disponibilidad del store, así un rol sin permiso recibe 403 (no 501)
//   también con el store en memoria (mismo patrón que reports-rbac, QA-05).
// - scope=operativa mantiene el acceso de cualquier autenticado: el store en
//   memoria no implementa listAlerts, por eso un rol permitido recibe 501 —
//   eso prueba que la validación y el guard dejaron pasar la request.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const sign = role => jwt.sign({ sub: 'usr_test', role }, 'dev-secret', { expiresIn: '5m' });

const get = (path, role) =>
  request(createApp()).get(path).set('Authorization', `Bearer ${sign(role)}`);

describe('Contrato D12: scope en GET /api/v1/alerts', () => {
  test.each(['vigilante', 'recepcionista', 'recepcion', 'visualizador', 'tecnico'])(
    "scope=historial con rol '%s' → 403",
    async role => {
      const res = await get('/api/v1/alerts?scope=historial', role);
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  );

  test.each(['supervisor', 'responsable_seguridad', 'admin_parque'])(
    "scope=historial con rol '%s' pasa el guard (501 del store en memoria)",
    async role => {
      const res = await get('/api/v1/alerts?scope=historial', role);
      expect(res.statusCode).toBe(501);
      expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
    }
  );

  test('scope=operativa con vigilante pasa el guard (501 del store en memoria)', async () => {
    const res = await get('/api/v1/alerts?scope=operativa', 'vigilante');
    expect(res.statusCode).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  test('sin scope mantiene el contrato actual para cualquier autenticado (501 en memoria)', async () => {
    const res = await get('/api/v1/alerts', 'vigilante');
    expect(res.statusCode).toBe(501);
  });

  test('scope inválido → 400 VALIDATION_ERROR', async () => {
    const res = await get('/api/v1/alerts?scope=archivadas', 'admin_parque');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test("'from' inválido → 400 antes de tocar el store", async () => {
    const res = await get('/api/v1/alerts?scope=historial&from=ayer', 'admin_parque');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('pageSize fuera de rango (>100) → 400', async () => {
    const res = await get('/api/v1/alerts?scope=historial&pageSize=500', 'admin_parque');
    expect(res.statusCode).toBe(400);
  });

  test('criticality inválida → 400', async () => {
    const res = await get('/api/v1/alerts?scope=historial&criticality=urgente', 'admin_parque');
    expect(res.statusCode).toBe(400);
  });

  test('sin token → 401', async () => {
    const res = await request(createApp()).get('/api/v1/alerts?scope=historial');
    expect(res.statusCode).toBe(401);
  });
});
