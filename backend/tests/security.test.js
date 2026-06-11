const request = require('supertest');
const { createApp } = require('../src/app');

describe('backend hardening MVP', () => {
  it('denies cross-tenant access and supports idempotent ingestion + signed evidence URL', async () => {
    const app = createApp();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'guardia@agrolivo.cl', password: 'secret' });

    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeDefined();
    expect(login.body.refresh_token).toBeDefined();

    const token = login.body.access_token;

    const denied = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .query({ tenant_id: 'other_tenant', site_id: 'site-1' });

    expect(denied.status).toBe(403);

    const ingest = {
      source: { connector_id: 'edge_agrolivo_01', device_id: 'cam_045', nvr_id: 'nvr_02' },
      event: {
        external_event_id: 'dahua-9834201',
        type: 'LINE_CROSSING',
        severity: 'HIGH',
        occurred_at: '2026-05-27T18:40:22Z',
        zone_code: 'PERIMETRO_PONIENTE'
      },
      evidence: { snapshot_url: 's3://evidence/tmp/abc.jpg' },
      raw_payload: { vendor: 'dahua' }
    };

    const first = await request(app)
      .post('/api/v1/ingestion/events')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'idem-001')
      .set('X-Request-Id', 'req-1')
      .send(ingest);

    expect(first.status).toBe(202);
    expect(first.body.status).toBe('RECEIVED');

    const second = await request(app)
      .post('/api/v1/ingestion/events')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'idem-001')
      .set('X-Request-Id', 'req-2')
      .send(ingest);

    expect(second.status).toBe(202);
    expect(second.body.event_id).toBe(first.body.event_id);

    const list = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .query({ tenant_id: 'agrolivo', site_id: 'site-1' });

    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].evidence.snapshot_url).toContain('/api/v1/evidence/sign');

    const sign = await request(app)
      .post('/api/v1/evidence/sign')
      .set('Authorization', `Bearer ${token}`)
      .send({ object_url: 's3://evidence/tmp/abc.jpg', checksum_sha256: 'a'.repeat(64), ttl_seconds: 60 });

    expect(sign.status).toBe(200);
    expect(sign.body.signed_url).toContain('expires=');
    expect(sign.body.checksum_sha256).toBe('a'.repeat(64));

    const audit = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(audit.status).toBe(200);
    expect(audit.body.items.some((x) => x.request_id === 'req-1')).toBe(true);
  });

  it('rotates refresh token and revokes previous one', async () => {
    const app = createApp();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@agrolivo.cl', password: 'secret' });

    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: login.body.refresh_token });

    expect(firstRefresh.status).toBe(200);
    expect(firstRefresh.body.refresh_token).toBeDefined();

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: login.body.refresh_token });

    expect(reused.status).toBe(401);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refresh_token: firstRefresh.body.refresh_token });

    expect(logout.status).toBe(204);

    const afterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: firstRefresh.body.refresh_token });

    expect(afterLogout.status).toBe(401);
  });
});