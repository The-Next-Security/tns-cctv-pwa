const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID, createHash } = require('crypto');

const ACCESS_SECRET = 'access-secret-rs256-simulated';
const REFRESH_SECRET = 'refresh-secret-rs256-simulated';

const users = [
  { id: 'u_123', email: 'guardia@agrolivo.cl', password: 'secret', role: 'GUARD', tenant_id: 'agrolivo', site_ids: ['site-1'] },
  { id: 'u_124', email: 'admin@agrolivo.cl', password: 'secret', role: 'ADMIN', tenant_id: 'agrolivo', site_ids: ['site-1'] }
];

function createStore() {
  return {
    refreshTokens: new Map(),
    revokedRefreshTokenJti: new Set(),
    idempotency: new Map(),
    events: [],
    auditLogs: []
  };
}

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tenant_id: user.tenant_id, site_ids: user.site_ids },
    ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function signRefresh(user) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, tenant_id: user.tenant_id, jti },
    REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
  return { token, jti };
}

function auth(req, res, next) {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'missing bearer token' } });

  try {
    req.user = jwt.verify(token, ACCESS_SECRET, { algorithms: ['HS256'] });
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'invalid token' } });
  }
}

function tenantScope(req, res, next) {
  const { tenant_id, site_id } = req.query;
  if (tenant_id && tenant_id !== req.user.tenant_id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'cross-tenant access denied' } });
  if (site_id && !req.user.site_ids.includes(site_id)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'site access denied' } });
  next();
}

function createApp() {
  const app = express();
  const store = createStore();

  app.use(express.json());
  app.use((req, _res, next) => {
    req.request_id = req.header('X-Request-Id') || `req_${randomUUID()}`;
    next();
  });

  const audit = (req, action, entity_type, entity_id, payload = {}) => {
    store.auditLogs.push({
      tenant_id: req.user?.tenant_id || payload.tenant_id || 'unknown',
      actor_user_id: req.user?.sub || null,
      actor_type: req.user ? 'USER' : 'SYSTEM',
      action,
      entity_type,
      entity_id,
      request_id: req.request_id,
      payload,
      created_at: new Date().toISOString()
    });
  };

  app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'invalid credentials' } });

    const access_token = signAccess(user);
    const { token: refresh_token, jti } = signRefresh(user);
    store.refreshTokens.set(jti, { user_id: user.id, tenant_id: user.tenant_id, revoked: false });

    return res.status(200).json({ access_token, refresh_token, expires_in: 3600, user: { id: user.id, role: user.role } });
  });

  app.post('/api/v1/auth/refresh', (req, res) => {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refresh_token is required' } });

    try {
      const payload = jwt.verify(refresh_token, REFRESH_SECRET, { algorithms: ['HS256'] });
      const row = store.refreshTokens.get(payload.jti);
      if (!row || row.revoked || store.revokedRefreshTokenJti.has(payload.jti)) {
        return res.status(401).json({ error: { code: 'REFRESH_REVOKED', message: 'refresh token revoked' } });
      }

      row.revoked = true;
      store.revokedRefreshTokenJti.add(payload.jti);

      const user = users.find((u) => u.id === payload.sub);
      const access_token = signAccess(user);
      const rotated = signRefresh(user);
      store.refreshTokens.set(rotated.jti, { user_id: user.id, tenant_id: user.tenant_id, revoked: false });

      return res.status(200).json({ access_token, refresh_token: rotated.token, expires_in: 3600 });
    } catch {
      return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'invalid refresh token' } });
    }
  });

  app.post('/api/v1/auth/logout', (req, res) => {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(204).send();
    try {
      const payload = jwt.verify(refresh_token, REFRESH_SECRET, { algorithms: ['HS256'] });
      const row = store.refreshTokens.get(payload.jti);
      if (row) row.revoked = true;
      store.revokedRefreshTokenJti.add(payload.jti);
    } catch {
      // no-op
    }
    return res.status(204).send();
  });

  app.post('/api/v1/ingestion/events', auth, (req, res) => {
    const idem = req.header('X-Idempotency-Key');
    if (!idem) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'X-Idempotency-Key is required', request_id: req.request_id } });

    const key = `${req.user.tenant_id}:${idem}`;
    const existing = store.idempotency.get(key);
    if (existing) return res.status(202).json(existing);

    const event_id = `evt_${randomUUID()}`;
    const evidenceUrl = req.body?.evidence?.snapshot_url || null;
    const item = {
      event_id,
      tenant_id: req.user.tenant_id,
      site_id: req.user.site_ids[0],
      type: req.body?.event?.type || 'UNKNOWN',
      severity: req.body?.event?.severity || 'MEDIUM',
      state: 'NEW',
      occurred_at: req.body?.event?.occurred_at || new Date().toISOString(),
      evidence: {
        object_url: evidenceUrl,
        checksum_sha256: evidenceUrl ? createHash('sha256').update(evidenceUrl).digest('hex') : null
      }
    };

    store.events.push(item);
    const response = { event_id, status: 'RECEIVED' };
    store.idempotency.set(key, response);
    audit(req, 'INGEST_EVENT', 'security_event', event_id, { idempotency_key: idem });

    return res.status(202).json(response);
  });

  app.get('/api/v1/events', auth, tenantScope, (req, res) => {
    const tenant = req.query.tenant_id || req.user.tenant_id;
    const site = req.query.site_id || req.user.site_ids[0];

    const items = store.events
      .filter((e) => e.tenant_id === tenant && e.site_id === site)
      .map((e) => ({
        event_id: e.event_id,
        type: e.type,
        severity: e.severity,
        state: e.state,
        occurred_at: e.occurred_at,
        evidence: {
          snapshot_url: `/api/v1/evidence/sign?event_id=${encodeURIComponent(e.event_id)}`
        }
      }));

    return res.status(200).json({ items, total: items.length, page: 1, page_size: 20 });
  });

  app.post('/api/v1/evidence/sign', auth, (req, res) => {
    const { object_url, checksum_sha256, ttl_seconds = 60 } = req.body || {};
    if (!object_url || !checksum_sha256) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'object_url and checksum_sha256 are required', request_id: req.request_id } });
    }

    const expires = Math.floor(Date.now() / 1000) + Math.min(ttl_seconds, 300);
    const signature = createHash('sha256').update(`${object_url}|${expires}|${req.user.tenant_id}`).digest('hex');
    const signed_url = `/api/v1/evidence/access?object_url=${encodeURIComponent(object_url)}&expires=${expires}&sig=${signature}`;
    audit(req, 'SIGN_EVIDENCE_URL', 'event_evidence', object_url, { expires, checksum_sha256 });

    return res.status(200).json({ signed_url, expires_at: expires, checksum_sha256 });
  });

  app.get('/api/v1/audit-logs', auth, (req, res) => {
    const items = store.auditLogs.filter((l) => l.tenant_id === req.user.tenant_id);
    return res.status(200).json({ items });
  });

  return app;
}

module.exports = { createApp };
