const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { Store } = require('./store');
const { errorEnvelope } = require('./errors');

const { resolveJwtSecret } = require('./config');
const { createAuthMiddleware, createIngestAuthMiddleware, requireRole } = require('./auth');
const { createPushService } = require('./push');
const { registerReportRoutes } = require('./reportsRoutes.cjs');

const JWT_SECRET = resolveJwtSecret();

// Roles notificados al escalar (D9); el detalle por regla llega con CRUD de reglas (post go-live).
const ESCALATION_PUSH_ROLES = ['responsable_seguridad', 'admin_parque', 'supervisor'];

const USER_ROLE_VALUES = [
  'admin_parque',
  'supervisor',
  'responsable_seguridad',
  'vigilante',
  'recepcion',
  'recepcionista',
  'tecnico',
  'visualizador',
];

// D10 (PRD-V2): access token 60 min; sesión máxima (refresh) 10 h.
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_SESSION_TTL_MS = 10 * 60 * 60 * 1000;

function createApp(deps = {}) {
  const app = express();
  const store = deps.store || new Store();
  const wsHub = deps.wsHub;

  // Sesiones de refresh en memoria (instancia única). Reiniciar el backend
  // obliga a re-login, aceptable para el go-live de un solo nodo.
  const refreshSessions = new Map();

  function issueSession(publicUser, sessionExpiresAt) {
    const accessToken = jwt.sign(
      {
        sub: publicUser.id,
        tenant_id: publicUser.tenant_id,
        role: publicUser.role,
        email: publicUser.email,
        nombre: publicUser.nombre,
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );
    const refreshToken = `rft_${crypto.randomUUID().replace(/-/g, '')}`;
    refreshSessions.set(refreshToken, { user: publicUser, sessionExpiresAt });
    return { accessToken, refreshToken };
  }

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    const rid = req.headers['x-request-id'] || `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    req.requestId = rid;
    res.setHeader('x-request-id', rid);
    next();
  });

  // Seguridad (Paso 2): JWT en todo el API salvo /auth/login y /health/*;
  // /ingest/* usa API key máquina-a-máquina (middleware propio en la ruta).
  app.use(createAuthMiddleware({ jwtSecret: JWT_SECRET }));
  const ingestAuth = createIngestAuthMiddleware({ store });
  const pushService = deps.pushService || createPushService({ store });

  app.post('/api/v1/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const user = await store.auth(parsed.data.email, parsed.data.password);
    if (!user) return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'invalid credentials', req.requestId));

    const publicUser = {
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
    };
    // D10: la sesión completa dura 10 h (turno de 8 h + margen); la rotación
    // del refresh token NO extiende ese tope absoluto.
    const tokens = issueSession(publicUser, Date.now() + REFRESH_SESSION_TTL_MS);

    return res.status(200).json({
      access_token: tokens.accessToken,
      // alias para el cliente del frontend (lib/api.ts espera `token`)
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      token_type: 'Bearer',
      user: publicUser,
      request_id: req.requestId,
    });
  });

  // D10: refresh rotativo — cada uso invalida el token anterior y emite uno nuevo.
  app.post('/api/v1/auth/refresh', (req, res) => {
    const schema = z.object({ refresh_token: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }

    const session = refreshSessions.get(parsed.data.refresh_token);
    refreshSessions.delete(parsed.data.refresh_token); // un solo uso (rotativo)
    if (!session || session.sessionExpiresAt <= Date.now()) {
      return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'refresh token inválido o sesión expirada', req.requestId));
    }

    const tokens = issueSession(session.user, session.sessionExpiresAt);
    return res.status(200).json({
      access_token: tokens.accessToken,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      token_type: 'Bearer',
      user: session.user,
      request_id: req.requestId,
    });
  });

  // D10: identidad de la sesión actual a partir del JWT.
  app.get('/api/v1/auth/me', (req, res) => {
    return res.status(200).json({
      id: req.user.sub,
      user_id: req.user.sub,
      tenant_id: req.user.tenant_id,
      email: req.user.email,
      nombre: req.user.nombre,
      role: req.user.role,
      activo: true,
      request_id: req.requestId,
    });
  });

  app.post('/api/v1/ingest/events', ingestAuth, async (req, res) => {
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

    // M6: un evento recibido también cuenta como señal de vida de la fuente.
    // Si el heartbeat falla se loggea, pero no se rechaza el evento ya ingerido.
    if (typeof store.recordSourceHeartbeat === 'function') {
      try {
        await store.recordSourceHeartbeat(parsed.data.source.source_id);
      } catch (err) {
        console.warn(`[ingest] heartbeat de fuente no registrado: ${err.message}`);
      }
    }

    if (result.conflict) {
      return res.status(409).json(errorEnvelope('IDEMPOTENCY_CONFLICT', 'same key with different payload', req.requestId));
    }

    if (result.invalidSource) {
      return res.status(400).json(errorEnvelope('UNKNOWN_SOURCE', 'source.source_id no corresponde a ninguna fuente registrada (id_fuente o source_code)', req.requestId));
    }

    if (result.matched === false) {
      return res.status(202).json({
        status: 'STORED_RAW',
        matched: false,
        raw_event_id: result.raw_event_id,
        deduplicated: !!result.deduplicated,
        request_id: req.requestId,
      });
    }

    if (wsHub && result.event) wsHub.publishEventPopup(result.event, req.requestId);

    return res.status(202).json({
      status: 'RECEIVED',
      event_id: result.event.event_id,
      matched: true,
      matched_rule_ids: result.matched_rule_ids,
      deduplicated: !!result.deduplicated,
      request_id: req.requestId,
    });
  });

  // M6: heartbeat máquina-a-máquina del conector (misma API key del ingest).
  app.post('/api/v1/ingest/heartbeat', ingestAuth, async (req, res) => {
    if (typeof store.recordSourceHeartbeat !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'heartbeat no disponible en este store', req.requestId));
    }
    const schema = z.object({ source_id: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const result = await store.recordSourceHeartbeat(parsed.data.source_id);
    if (!result.updated) return res.status(404).json(errorEnvelope('NOT_FOUND', 'source not found', req.requestId));
    return res.status(200).json({ status: 'OK', request_id: req.requestId });
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

    const changed = await store.changeState(req.params.eventId, parsed.data.to_state, parsed.data.decision, parsed.data.comment, req.user.sub);
    if (changed.notFound) return res.status(404).json(errorEnvelope('NOT_FOUND', 'event not found', req.requestId));
    if (changed.invalid) {
      return res.status(400).json(errorEnvelope('INVALID_STATE_TRANSITION', `${changed.fromState} -> ${changed.toState} not allowed`, req.requestId));
    }

    return res.status(200).json({
      event_id: req.params.eventId,
      from_state: changed.fromState,
      to_state: parsed.data.to_state,
      changed_at: changed.changedAt,
      actor_user_id: req.user.sub,
      request_id: req.requestId,
    });
  });

  // --- Contrato de alertas para el frontend (requiere store con soporte) ---
  // Ciclo de vida (D12): scope=operativa acota la consola a abiertas + cerradas
  // <48h; scope=historial es la búsqueda forense paginada (solo supervisor+).
  const ALERT_HISTORY_ROLES = ['supervisor', 'responsable_seguridad', 'admin_parque'];

  app.get('/api/v1/alerts', async (req, res) => {
    const scopeSchema = z.object({
      scope: z.enum(['operativa', 'historial']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      zone_id: z.coerce.number().int().positive().optional(),
      criticality: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
      plate: z.string().max(16).optional(),
      resolved_by: z.string().max(64).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    });
    const parsed = scopeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid query', req.requestId, parsed.error.issues));
    }
    const q = parsed.data;
    for (const key of ['from', 'to']) {
      if (q[key] && Number.isNaN(new Date(q[key]).getTime())) {
        return res.status(400).json(errorEnvelope('VALIDATION_ERROR', `'${key}' no es una fecha válida`, req.requestId));
      }
    }

    // QA-05: el guard corre antes que la disponibilidad del store, para que un
    // rol sin permiso reciba 403 (y no 501) también con el store en memoria.
    if (q.scope === 'historial' && !ALERT_HISTORY_ROLES.includes(req.user?.role)) {
      return res.status(403).json(errorEnvelope('FORBIDDEN', 'rol sin permiso para el historial de alertas', req.requestId));
    }

    if (q.scope === 'historial') {
      if (typeof store.searchAlertHistory !== 'function') {
        return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'historial no disponible en este store', req.requestId));
      }
      const { items, total } = await store.searchAlertHistory({
        from: q.from,
        to: q.to,
        zoneId: q.zone_id,
        criticality: q.criticality,
        plate: q.plate,
        resolvedBy: q.resolved_by,
        page: q.page,
        pageSize: q.pageSize,
      });
      const pagination = {
        page: q.page,
        page_size: q.pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / q.pageSize)),
      };
      return res.status(200).json({ items, data: items, pagination, page: q.page, page_size: q.pageSize, total, request_id: req.requestId });
    }

    if (typeof store.listAlerts !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'alerts no disponible en este store', req.requestId));
    }
    const items = await store.listAlerts({ scope: q.scope });
    const pagination = { page: 1, page_size: items.length, total: items.length, total_pages: 1 };
    // Devolvemos ambas formas: `items` (contrato src) y `data`/`pagination` (PaginatedResponse del frontend).
    return res.status(200).json({ items, data: items, pagination, page: 1, page_size: items.length, total: items.length, request_id: req.requestId });
  });

  app.get('/api/v1/alerts/:eventId', async (req, res) => {
    if (typeof store.getAlert !== 'function' || typeof store.resolveEventId !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'alerts no disponible en este store', req.requestId));
    }
    const eventId = await store.resolveEventId(req.params.eventId);
    if (!eventId) return res.status(404).json(errorEnvelope('NOT_FOUND', 'alert not found', req.requestId));
    const alert = await store.getAlert(eventId);
    if (!alert) return res.status(404).json(errorEnvelope('NOT_FOUND', 'alert not found', req.requestId));
    return res.status(200).json({ ...alert, request_id: req.requestId });
  });

  app.post('/api/v1/alerts/:eventId/attend', async (req, res) => {
    if (typeof store.attendAlert !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'attend no disponible en este store', req.requestId));
    }
    const schema = z.object({
      action: z.enum(['acknowledge', 'resolve', 'escalate', 'discard', 'reactivate', 'activate', 'register_call']),
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

    // D9: la escalación dispara push real a los roles responsables. El registro
    // queda en ale_notificacion; un fallo de push no revierte la escalación.
    if (parsed.data.action === 'escalate') {
      try {
        await pushService.notifyRoles({
          tenantId: req.user.tenant_id,
          roles: ESCALATION_PUSH_ROLES,
          title: 'Alerta escalada — atención requerida',
          body: notes || `Alerta ${result.alert?.event_code ?? ''} escalada por ${req.user.nombre ?? req.user.sub}`,
          url: `/operacion/alerta/${result.alert?.id ?? ''}`,
          eventId,
        });
      } catch (err) {
        console.warn(`[push] escalación notificada con errores: ${err.message}`);
      }
    }

    return res.status(200).json({ ...result.alert, request_id: req.requestId });
  });

  // --- Web Push (D9) ---
  app.get('/api/v1/push/public-key', (req, res) => {
    return res.status(200).json({
      enabled: pushService.enabled,
      public_key: pushService.publicKey,
      request_id: req.requestId,
    });
  });

  app.post('/api/v1/push/subscriptions', async (req, res) => {
    if (typeof store.savePushSubscription !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'push no disponible en este store', req.requestId));
    }
    const schema = z.object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const result = await store.savePushSubscription(req.user.sub, {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: req.headers['user-agent'],
    });
    if (result?.notFound) return res.status(404).json(errorEnvelope('NOT_FOUND', 'usuario no encontrado', req.requestId));
    return res.status(201).json({ status: 'SUBSCRIBED', request_id: req.requestId });
  });

  // --- Usuarios (CRUD parcial; teléfono para escalación) ---
  app.get('/api/v1/users', async (req, res) => {
    if (typeof store.listUsers !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'users no disponible en este store', req.requestId));
    }
    const items = await store.listUsers();
    const pagination = { page: 1, page_size: items.length, total: items.length, total_pages: 1 };
    return res.status(200).json({ items, data: items, pagination, request_id: req.requestId });
  });

  app.post('/api/v1/users', requireRole('admin_parque'), async (req, res) => {
    if (typeof store.createUser !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'users no disponible en este store', req.requestId));
    }
    const schema = z.object({
      nombre: z.string().min(1),
      email: z.string().email(),
      telefono: z.string().min(1),
      role: z.enum(USER_ROLE_VALUES),
      password: z.string().min(8),
      activo: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const result = await store.createUser(parsed.data);
    if (result?.invalid) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', result.reason || 'usuario inválido', req.requestId));
    }
    return res.status(201).json({ ...result.user, request_id: req.requestId });
  });

  app.patch('/api/v1/users/:userId', requireRole('admin_parque'), async (req, res) => {
    if (typeof store.updateUser !== 'function') {
      return res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'users no disponible en este store', req.requestId));
    }
    const schema = z.object({
      nombre: z.string().min(1),
      email: z.string().email(),
      telefono: z.string().min(1),
      role: z.enum(USER_ROLE_VALUES),
      password: z.string().min(8).optional(),
      activo: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'invalid payload', req.requestId, parsed.error.issues));
    }
    const result = await store.updateUser(req.params.userId, parsed.data);
    if (result?.invalid) {
      return res.status(400).json(errorEnvelope('VALIDATION_ERROR', result.reason || 'usuario inválido', req.requestId));
    }
    if (!result?.user) {
      return res.status(404).json(errorEnvelope('NOT_FOUND', 'usuario no encontrado', req.requestId));
    }
    return res.status(200).json({ ...result.user, request_id: req.requestId });
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

  // --- Reportes (CIOC): KPIs reales, accountability y export CSV ---
  registerReportRoutes(app, { store });

  app.use((_, res) => res.status(404).json(errorEnvelope('NOT_FOUND', 'route not found', `req_${crypto.randomUUID().slice(0, 8)}`)));

  return app;
}

module.exports = { createApp };