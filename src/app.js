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

  app.post('/api/v1/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const user = await store.auth(parsed.data.email, parsed.data.password);
    if (!user) return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'invalid credentials', req.requestId));

    const accessToken = jwt.sign({ sub: user.id, tenant_id: user.tenant_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = `rft_${crypto.randomUUID().replace(/-/g, '')}`;

    return res.status(200).json({
      access_token: accessToken,
      // alias para el cliente del frontend (lib/api.ts espera `token`)
      token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer',
      user: {
        id: user.id,
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        nombre: user.nombre ?? user.full_name,
        apellido: user.apellido,
        full_name: user.full_name,
        role: user.app_role || user.role,
        permissions: user.permissions || [],
        site_ids: user.site_ids,
        activo: true,
      },
      request_id: req.requestId,
    });
  });

  app.post('/api/v1/ingest/events', async (req, res) => {
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
    const result = await store.ingestEvent(idempotencyKey, payloadHash, parsed.data);

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

  app.get('/api/v1/events', async (req, res) => {
    const items = await store.listEvents();
    return res.status(200).json({
      items,
      page: 1,
      page_size: 50,
      total: items.length,
      request_id: req.requestId,
    });
  });

  app.get('/api/v1/events/:eventId', async (req, res) => {
    const event = await store.getEvent(req.params.eventId);
    if (!event) return res.status(404).json(errorEnvelope('NOT_FOUND', 'event not found', req.requestId));
    const timeline = await store.getTimeline(req.params.eventId);
    return res.status(200).json({ ...event, timeline, request_id: req.requestId });
  });

  app.patch('/api/v1/events/:eventId/state', async (req, res) => {
    const schema = z.object({ to_state: z.enum(['IN_REVIEW', 'ESCALATING', 'CLOSED']), decision: z.string().min(1), comment: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const changed = await store.changeState(req.params.eventId, parsed.data.to_state, parsed.data.decision, parsed.data.comment, 'usr_01');
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

  // --- Contrato de alertas para el frontend (requiere store con soporte) ---
  app.get('/api/v1/alerts', async (req, res) => {
    if (typeof store.listAlerts !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'alerts no disponible en este store', req.requestId));
    }
    const items = await store.listAlerts();
    const pagination = { page: 1, page_size: items.length, total: items.length, total_pages: 1 };
    // Devolvemos ambas formas: `items` (contrato src) y `data`/`pagination` (PaginatedResponse del frontend).
    return res.status(200).json({ items, data: items, pagination, page: 1, page_size: items.length, total: items.length, request_id: req.requestId });
  });

  app.post('/api/v1/alerts/:eventId/attend', async (req, res) => {
    if (typeof store.attendAlert !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'attend no disponible en este store', req.requestId));
    }
    const schema = z.object({
      action: z.enum(['acknowledge', 'resolve', 'escalate', 'discard', 'revisada', 'descartada', 'escalada']),
      notes: z.string().optional(),
      observation: z.string().optional(),
      discard_note: z.string().optional(),
      discard_reason: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const notes = parsed.data.notes || parsed.data.observation || parsed.data.discard_note || parsed.data.discard_reason;
    const eventId = await store.resolveEventId(req.params.eventId);
    if (!eventId) return res.status(404).json(errorEnvelope('NOT_FOUND', 'alert not found', req.requestId));
    const result = await store.attendAlert(eventId, parsed.data.action, notes, req.user?.sub || null);
    if (result.notFound) return res.status(404).json(errorEnvelope('NOT_FOUND', 'alert not found', req.requestId));
    if (result.invalid) {
      return res.status(400).json(errorEnvelope('INVALID_STATE_TRANSITION', result.reason || 'transición inválida', req.requestId));
    }
    return res.status(200).json({ ...result.alert, request_id: req.requestId });
  });

  // --- Reglas operativas (solo lectura por ahora) ---
  app.get('/api/v1/rules', async (req, res) => {
    if (typeof store.listRules !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'rules no disponible en este store', req.requestId));
    }
    const items = await store.listRules();
    const pagination = { page: 1, page_size: items.length, total: items.length, total_pages: 1 };
    return res.status(200).json({ items, data: items, pagination, request_id: req.requestId });
  });

  // --- Salud del sistema (indicador del header) ---
  app.get('/api/v1/health/system', async (req, res) => {
    if (typeof store.systemHealth !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'health no disponible en este store', req.requestId));
    }
    const health = await store.systemHealth();
    return res.status(200).json({ ...health, request_id: req.requestId });
  });

  app.get('/api/v1/health/nvrs', async (req, res) => {
    if (typeof store.listNvrHealth !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'health no disponible en este store', req.requestId));
    }
    // El frontend espera un array plano (fetchApi devuelve el JSON sin desempaquetar).
    return res.status(200).json(await store.listNvrHealth());
  });

  // --- Ingresos vehiculares (adm_ingreso) ---
  app.get('/api/v1/vehicle-entries', async (req, res) => {
    if (typeof store.listVehicleEntries !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'vehicle-entries no disponible en este store', req.requestId));
    }
    const items = await store.listVehicleEntries({ plate: req.query.plate });
    const pagination = { page: 1, page_size: items.length, total: items.length, total_pages: 1 };
    return res.status(200).json({ items, data: items, pagination, request_id: req.requestId });
  });

  app.post('/api/v1/vehicle-entries', async (req, res) => {
    if (typeof store.createVehicleEntry !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'vehicle-entries no disponible en este store', req.requestId));
    }
    const schema = z.object({
      plate: z.string().min(1),
      declared_driver_name: z.string().optional(),
      declared_driver_id: z.string().nullish(),
      tenant_id: z.union([z.string(), z.number()]).optional(),
      destination_text: z.string().nullish(),
      vehicle_type: z.string().nullish(),
      entry_at: z.string().min(1),
      observations: z.string().nullish(),
      plate_source: z.string().optional(),
      anpr_confidence: z.number().nullish(),
      review_required: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const result = await store.createVehicleEntry(parsed.data, req.user?.sub || null);
    if (result.invalid) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', result.reason || 'ingreso inválido', req.requestId));
    }
    return res.status(201).json({ ...result.entry, request_id: req.requestId });
  });

  app.patch('/api/v1/vehicle-entries/:entryId', async (req, res) => {
    if (typeof store.updateVehicleEntry !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'vehicle-entries no disponible en este store', req.requestId));
    }
    const schema = z.object({
      exit_at: z.string().nullish(),
      observations: z.string().nullish(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const ingresoId = await store.resolveIngresoId(req.params.entryId);
    if (!ingresoId) return res.status(404).json(errorEnvelope('NOT_FOUND', 'entry not found', req.requestId));
    const result = await store.updateVehicleEntry(ingresoId, parsed.data);
    if (result.notFound) return res.status(404).json(errorEnvelope('NOT_FOUND', 'entry not found', req.requestId));
    if (result.unsupported) {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', result.reason, req.requestId));
    }
    if (result.invalid) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', result.reason || 'payload vacío', req.requestId));
    }
    return res.status(200).json({ ...result.entry, request_id: req.requestId });
  });

  app.use((_, res) => res.status(404).json(errorEnvelope('NOT_FOUND', 'route not found', `req_${crypto.randomUUID().slice(0, 8)}`)));

  return app;
}

module.exports = { createApp };