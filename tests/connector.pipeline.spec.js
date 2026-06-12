// Mapper + idempotencia + cliente ingest + digest del conector (Paso 3).
const crypto = require('crypto');
const { createEventMapper, buildIdempotencyKey } = require('../connector/src/eventMapper');
const { createIngestClient } = require('../connector/src/ingestClient');
const { parseChallenge, buildAuthorizationHeader } = require('../connector/src/digestAuth');

const MAPPING = {
  TrafficJunction: { event_type: 'TrafficJunction', severity: 'LOW' },
  CrossLineDetection: { event_type: 'CrossLineDetection', severity: 'CRITICAL' },
};

const NVR = {
  id: 'NV000000000000000000000001',
  channelZones: { 1: 'zone-1', 2: 'zone-2' },
};

describe('eventMapper', () => {
  const mapper = createEventMapper({
    mapping: MAPPING,
    nvr: NVR,
    tenantId: 'TN01',
    siteId: 'ST01',
  });

  test('mapea evento ANPR al contrato de ingest con zona y patente', () => {
    const result = mapper.map(
      { code: 'TrafficJunction', channel: 1, pts: '123.0', plate: 'ZZZ12345' },
      { occurredAt: '2026-06-11T12:00:00.000Z', snapshotUri: 'file:///tmp/snap.jpg' }
    );

    expect(result.payload).toEqual({
      tenant_id: 'TN01',
      site_id: 'ST01',
      source: { source_id: NVR.id, source_type: 'NVR', vendor: 'DAHUA' },
      event: {
        external_id: `${NVR.id}-ch1-123.0`,
        event_type: 'TrafficJunction',
        severity: 'LOW',
        zone_code: 'zone-1',
        plate: 'ZZZ12345',
        occurred_at: '2026-06-11T12:00:00.000Z',
        evidence: [{ type: 'SNAPSHOT', uri: 'file:///tmp/snap.jpg' }],
        payload_version: '1.0',
      },
    });
  });

  test('código sin mapping devuelve null (se ignora con log)', () => {
    expect(mapper.map({ code: 'CodigoDesconocido', channel: 1 })).toBeNull();
  });

  test('idempotency-key = hash(nvr, canal, código, PTS) — estable y única', () => {
    const base = { nvrId: 'NV01', channel: 1, code: 'CrossLineDetection', pts: '99.0' };

    expect(buildIdempotencyKey(base)).toBe(buildIdempotencyKey({ ...base }));
    expect(buildIdempotencyKey(base)).toBe(
      crypto.createHash('sha256').update('NV01|1|CrossLineDetection|99.0').digest('hex')
    );
    expect(buildIdempotencyKey({ ...base, pts: '100.0' })).not.toBe(buildIdempotencyKey(base));
    expect(buildIdempotencyKey({ ...base, channel: 2 })).not.toBe(buildIdempotencyKey(base));
  });
});

describe('ingestClient', () => {
  test('envía x-api-key y x-idempotency-key y acepta 202', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return { status: 202, json: async () => ({ status: 'RECEIVED' }) };
    };
    const client = createIngestClient({ baseUrl: 'http://api', apiKey: 'k3y', fetchImpl });

    const res = await client.send({ idempotencyKey: 'idem-1', payload: { a: 1 } });

    expect(res.status).toBe('RECEIVED');
    expect(calls[0].url).toBe('http://api/api/v1/ingest/events');
    expect(calls[0].options.headers['x-api-key']).toBe('k3y');
    expect(calls[0].options.headers['x-idempotency-key']).toBe('idem-1');
  });

  test('no reintenta errores 4xx (permanentes)', async () => {
    let attempts = 0;
    const fetchImpl = async () => {
      attempts += 1;
      return { status: 401, text: async () => 'unauthorized' };
    };
    const client = createIngestClient({ baseUrl: 'http://api', apiKey: 'mala', fetchImpl });

    await expect(client.send({ idempotencyKey: 'x', payload: {} })).rejects.toThrow(/401/);
    expect(attempts).toBe(1);
  });
});

describe('digestAuth (RFC 7616, ejemplo RFC 2617 §3.5)', () => {
  test('parsea el challenge WWW-Authenticate', () => {
    const challenge = parseChallenge(
      'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"'
    );

    expect(challenge).toEqual(
      expect.objectContaining({
        realm: 'testrealm@host.com',
        qop: 'auth,auth-int',
        nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
        opaque: '5ccc069c403ebaf9f0171e9517f40e41',
      })
    );
  });

  test('calcula el response del ejemplo canónico del RFC', () => {
    // RFC 2617 §3.5: Mufasa / Circle Of Life — response esperado conocido.
    const header = buildAuthorizationHeader({
      username: 'Mufasa',
      password: 'Circle Of Life',
      method: 'GET',
      uri: '/dir/index.html',
      cnonce: '0a4f113b',
      nc: 1,
      challenge: {
        realm: 'testrealm@host.com',
        qop: 'auth',
        nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093',
        opaque: '5ccc069c403ebaf9f0171e9517f40e41',
      },
    });

    expect(header).toContain('response="6629fae49393a05397450978507c4ef1"');
    expect(header).toContain('username="Mufasa"');
    expect(header).toContain('nc=00000001');
    expect(header).toContain('qop=auth');
  });

  test('header no-Digest devuelve null', () => {
    expect(parseChallenge('Basic realm="x"')).toBeNull();
    expect(parseChallenge(undefined)).toBeNull();
  });
});
