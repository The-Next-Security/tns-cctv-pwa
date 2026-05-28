const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { Store } = require('./store');
const { errorEnvelope } = require('./errors');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function createApp(deps = {}) {
  const app = express();
  const store = deps.store || new Store();
  const wsHub = deps.wsHub;

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    req.requestId = rid;
    res.setHeader('x-request-id', rid);
    next();
  });

  app.post('/api/v1/auth/login', (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const user = store.auth(parsed.data.email, parsed.data.password);
    if (!user) return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'invalid credentials', req.requestId));

    const accessToken = jwt.sign({ sub: user.id, tenant_id: user.tenant_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = `rft_${crypto.randomUUID().replace(/-/g, '')}`;

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer',
      user: { user_id: user.id, tenant_id: user.tenant_id, role: user.role, site_ids: user.site_ids },
      request_id: req.requestId,
    });
  });

  app.post('/api/v1/ingest/events', (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'x-idempotency-key is required', req.requestId));
    }

    const schema = z.object({
      tenant_id: z.string().min(1),
      site_id: z.string().min(1),
      source: z.object({ source_id: z.string().min(1), source_type: z.string().min(1), vendor: z.string().optional() }),
      event: z.object({
        external_id: z.string().optional(),
        event_type: z.string().min(1),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        zone_code: z.string().optional(),
        plate: z.string().optional(),
        occurred_at: z.string().datetime(),
        evidence: z.array(z.object({ type: z.string(), uri: z.string(), sha256: z.string().optional() })).optional(),
        payload_version: z.string().default('1.0'),
      }),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    const result = store.ingestEvent(idempotencyKey, payloadHash, parsed.data);

    if (result.conflict) {
      return res.status(409).json(errorEnvelope('IDEMPOTENCY_CONFLICT', 'same key with different payload', req.requestId));
    }

    if (wsHub) wsHub.publishEventPopup(result.event, req.requestId);

    return res.status(202).json({
      status: 'RECEIVED',
      event_id: result.event.event_id,
      deduplicated: result.deduplicated,
      request_id: req.requestId,
    });
  });

  app.get('/api/v1/events', (req, res) => {
    const items = store.listEvents();
    return res.status(200).json({
      items,
      page: 1,
      page_size: 50,
      total: items.length,
      request_id: req.requestId,
    });
  });

  app.get('/api/v1/events/:eventId', (req, res) => {
    const event = store.getEvent(req.params.eventId);
    if (!event) return res.status(404).json(errorEnvelope('NOT_FOUND', 'event not found', req.requestId));
    return res.status(200).json({ ...event, timeline: store.getTimeline(req.params.eventId), request_id: req.requestId });
  });

  app.patch('/api/v1/events/:eventId/state', (req, res) => {
    const schema = z.object({ to_state: z.enum(['IN_REVIEW', 'CLOSED']), decision: z.string().min(1), comment: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const changed = store.changeState(req.params.eventId, parsed.data.to_state, parsed.data.decision, parsed.data.comment, 'usr_01');
    if (changed.notFound) return res.status(404).json(errorEnvelope('NOT_FOUND', 'event not found', req.requestId));
    if (changed.invalid) {
      return res.status(400).json(errorEnvelope('INVALID_STATE_TRANSITION', `${changed.fromState} -> ${changed.toState} not allowed`, req.requestId));
    }

    return res.status(200).json({
      event_id: req.params.eventId,
      from_state: changed.fromState,
      to_state: parsed.data.to_state,
      changed_at: changed.changedAt,
      actor_user_id: 'usr_01',
      request_id: req.requestId,
    });
  });

  app.use((_, res) => res.status(404).json(errorEnvelope('NOT_FOUND', 'route not found', `req_${crypto.randomUUID().slice(0, 8)}`)));

  return app;
}

module.exports = { createApp };