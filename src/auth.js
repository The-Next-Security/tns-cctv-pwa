// Seguridad del API (HANDOFF §2 Paso 2):
// - JWT obligatorio en toda ruta excepto /auth/login y /health/*.
// - /ingest/events es máquina-a-máquina: API key (x-api-key), no JWT.
const jwt = require('jsonwebtoken');
const { errorEnvelope } = require('./errors');
const { resolveIngestApiKey } = require('./config');

const PUBLIC_PATHS = [/^\/api\/v1\/auth\/login$/, /^\/api\/v1\/auth\/refresh$/, /^\/api\/v1\/health\//];
const MACHINE_PATHS = [/^\/api\/v1\/ingest\//];

function createAuthMiddleware({ jwtSecret }) {
  return (req, res, next) => {
    if (PUBLIC_PATHS.some(p => p.test(req.path))) return next();
    if (MACHINE_PATHS.some(p => p.test(req.path))) return next(); // protegido por createIngestAuthMiddleware

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'token requerido', req.requestId));
    }
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'token inválido o expirado', req.requestId));
    }
    return next();
  };
}

function createIngestAuthMiddleware({ store, env = process.env }) {
  const supportsDbValidation = typeof store.validateIngestApiKey === 'function';
  // Fallback solo para store en memoria / desarrollo; en producción sin
  // validación por BD, resolveIngestApiKey hace fail-fast al crear la app (D7).
  const fallbackKey = supportsDbValidation ? null : resolveIngestApiKey(env);

  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'x-api-key requerido', req.requestId));
    }
    if (supportsDbValidation) {
      const connector = await store.validateIngestApiKey(apiKey);
      if (!connector) {
        return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'api key inválida', req.requestId));
      }
      req.connector = connector;
      return next();
    }
    if (apiKey !== fallbackKey) {
      return res.status(401).json(errorEnvelope('UNAUTHORIZED', 'api key inválida', req.requestId));
    }
    return next();
  };
}

module.exports = { createAuthMiddleware, createIngestAuthMiddleware };
