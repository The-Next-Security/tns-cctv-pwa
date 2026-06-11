const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /api/v1/alerts/:id', () => {
  it('returns resolution_notes from the latest CLOSED operator note instead of the decision code', async () => {
    const app = createApp({
      seedEvents: [
        {
          event_id: 'evt_alert_1',
          tenant_id: 'agrolivo',
          site_id: 'site-1',
          type: 'LINE_CROSSING',
          severity: 'HIGH',
          state: 'CLOSED',
          occurred_at: '2026-05-27T18:40:22Z',
          timeline: [
            {
              from_state: 'NEW',
              to_state: 'ESCALATING',
              decision_code: 'ESCALATING',
              comment_text: 'Escalado a supervisor',
              changed_at: '2026-05-27T18:45:22Z',
              actor_user_id: 'u_123'
            },
            {
              from_state: 'ESCALATING',
              to_state: 'CLOSED',
              decision_code: 'CONFIRMED',
              comment_text: 'QA: incidente verificado y controlado. Cierre de prueba E2E.',
              changed_at: '2026-05-27T18:50:22Z',
              actor_user_id: 'u_123'
            }
          ]
        }
      ]
    });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guardia@agrolivo.cl', password: 'secret' });

    const response = await request(app)
      .get('/api/v1/alerts/evt_alert_1')
      .set('Authorization', `Bearer ${login.body.access_token}`);

    expect(response.status).toBe(200);
    expect(response.body.event_id).toBe('evt_alert_1');
    expect(response.body.resolution_notes).toBe('QA: incidente verificado y controlado. Cierre de prueba E2E.');
    expect(response.body.resolution_notes).not.toBe('CONFIRMED');
  });
});
