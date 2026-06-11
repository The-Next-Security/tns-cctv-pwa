const request = require('supertest');
const { createApp } = require('../src/app');

describe('API contract MVP CCTV', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test('POST /api/v1/auth/login responde token y user context', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guardia@tenant.cl', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        expires_in: 3600,
        token_type: 'Bearer',
        user: expect.objectContaining({
          role: 'GUARD',
        }),
        request_id: expect.any(String),
      }),
    );
  });

  test('POST /api/v1/ingest/events maneja idempotencia', async () => {
    const key = 'idem-123';
    const payload = {
      tenant_id: 'tn_01',
      site_id: 'st_01',
      source: { source_id: 'src_nvr1', source_type: 'NVR', vendor: 'DAHUA' },
      event: {
        external_id: 'ext_1',
        event_type: 'PERIMETER_INTRUSION',
        severity: 'HIGH',
        zone_code: 'NORTE-01',
        plate: 'ABCD12',
        occurred_at: '2026-05-28T19:02:00Z',
        evidence: [{ type: 'SNAPSHOT', uri: 's3://evidence/f.jpg', sha256: 'abc' }],
        payload_version: '1.0',
      },
    };

    const first = await request(app).post('/api/v1/ingest/events').set('x-idempotency-key', key).send(payload);
    const second = await request(app).post('/api/v1/ingest/events').set('x-idempotency-key', key).send(payload);

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(first.body.event_id).toBe(second.body.event_id);
    expect(second.body.deduplicated).toBe(true);
  });

  test('PATCH /api/v1/events/:id/state valida transiciones', async () => {
    const ingest = await request(app)
      .post('/api/v1/ingest/events')
      .set('x-idempotency-key', 'idem-state')
      .send({
        tenant_id: 'tn_01',
        site_id: 'st_01',
        source: { source_id: 'src_nvr1', source_type: 'NVR', vendor: 'DAHUA' },
        event: {
          external_id: 'ext_state',
          event_type: 'PERIMETER_INTRUSION',
          severity: 'HIGH',
          occurred_at: '2026-05-28T19:02:00Z',
          payload_version: '1.0',
          evidence: [],
        },
      });

    const eventId = ingest.body.event_id;

    const invalid = await request(app)
      .patch(`/api/v1/events/${eventId}/state`)
      .send({ to_state: 'CLOSED', decision: 'SKIP', comment: 'invalid' });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_STATE_TRANSITION');

    const ok = await request(app)
      .patch(`/api/v1/events/${eventId}/state`)
      .send({ to_state: 'IN_REVIEW', decision: 'INSPECTING', comment: 'ok' });

    expect(ok.statusCode).toBe(200);
    expect(ok.body.to_state).toBe('IN_REVIEW');
  });
});