// Test de contrato D2 (HANDOFF §2 Paso 1): el vocabulario de acciones de alerta
// es ÚNICO y canónico (attendEvent). Si los alias legacy (revisada/descartada/
// escalada) reaparecen como ACCIONES en la API o el cliente, esta suite falla.
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const TOKEN = jwt.sign({ sub: 'usr_test', role: 'GUARD' }, 'dev-secret', { expiresIn: '5m' });

const CANONICAL_ACTIONS = ['acknowledge', 'resolve', 'escalate', 'discard', 'reactivate', 'activate', 'register_call'];
const LEGACY_ACTIONS = ['revisada', 'descartada', 'escalada'];

function stubStore() {
  return {
    resolveEventId: async id => id,
    attendAlert: async () => ({ alert: { id: 1, status: 'resuelta' } }),
  };
}

describe('Contrato D2: vocabulario único attendEvent', () => {
  test.each(LEGACY_ACTIONS)('POST /alerts/:id/attend rechaza acción legacy "%s" con 400', async action => {
    const app = createApp({ store: stubStore() });
    const res = await request(app)
      .post('/api/v1/alerts/evt_01/attend')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ action, notes: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test.each(CANONICAL_ACTIONS)('POST /alerts/:id/attend acepta acción canónica "%s"', async action => {
    const app = createApp({ store: stubStore() });
    const res = await request(app)
      .post('/api/v1/alerts/evt_01/attend')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ action, notes: 'x' });
    expect(res.statusCode).toBe(200);
  });

  test('lib/api.ts no expone alerts.attend() ni acciones legacy', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'api.ts'), 'utf8');
    expect(source).not.toMatch(/\battend:\s*\(/);
    for (const legacy of LEGACY_ACTIONS) {
      expect(source).not.toContain(`'${legacy}'`);
    }
  });

  test('el cliente no envía acciones legacy a la API', () => {
    // Las acciones legacy solo pueden existir como ESTADOS de UI (AlertStatus),
    // nunca como argumento de attendEvent ni payload { action: ... }.
    const roots = ['app', 'components', 'hooks'];
    const offenders = [];
    const actionPattern = new RegExp(
      `(attendEvent\\([^)]*'(${LEGACY_ACTIONS.join('|')})')|(action:\\s*'(${LEGACY_ACTIONS.join('|')})')`
    );
    for (const root of roots) {
      walk(path.join(__dirname, '..', root), file => {
        if (!/\.(ts|tsx)$/.test(file)) return;
        const source = fs.readFileSync(file, 'utf8');
        if (actionPattern.test(source)) offenders.push(file);
      });
    }
    expect(offenders).toEqual([]);
  });

  test('mysqlStore ACTION_MAP no contiene alias legacy', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'mysqlStore.cjs'), 'utf8');
    for (const legacy of LEGACY_ACTIONS) {
      expect(source).not.toMatch(new RegExp(`^\\s*${legacy}:`, 'm'));
    }
  });
});

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}
