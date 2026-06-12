// Reportes (CIOC): endpoints de solo lectura sobre las agregaciones del store.
// RBAC servidor (patrón QA-05): la UI oculta secciones por rol, pero el guard
// vive aquí — `reports.view` para el resumen; auditoría/operadores solo
// admin_parque|supervisor (accountability del equipo y subcontratadas).
const { z } = require('zod');
const { errorEnvelope } = require('./errors');
const { requireRole } = require('./auth');

const REPORT_VIEWER_ROLES = ['admin_parque', 'supervisor', 'responsable_seguridad', 'tecnico'];
const AUDIT_ROLES = ['admin_parque', 'supervisor'];

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.join(';')];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(';'));
  // BOM para que Excel (es-CL) abra UTF-8 con acentos correctos.
  return '\ufeff' + lines.join('\r\n');
}

function registerReportRoutes(app, { store }) {
  const notImplemented = (res, req) =>
    res.status(501).json(errorEnvelope('NOT_IMPLEMENTED', 'reports no disponible en este store', req.requestId));

  const parseRange = (req, res) => {
    const parsed = rangeSchema.safeParse({ from: req.query.from, to: req.query.to });
    if (!parsed.success) {
      res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'from/to deben ser fechas ISO 8601', req.requestId, parsed.error.issues));
      return null;
    }
    return parsed.data;
  };

  app.get('/api/v1/reports/summary', requireRole(...REPORT_VIEWER_ROLES), async (req, res) => {
    if (typeof store.reportSummary !== 'function') return notImplemented(res, req);
    const range = parseRange(req, res);
    if (!range) return;
    const summary = await store.reportSummary(range);
    return res.status(200).json({ ...summary, request_id: req.requestId });
  });

  app.get('/api/v1/reports/operators', requireRole(...AUDIT_ROLES), async (req, res) => {
    if (typeof store.reportOperators !== 'function') return notImplemented(res, req);
    const range = parseRange(req, res);
    if (!range) return;
    const items = await store.reportOperators(range);
    return res.status(200).json({ items, total: items.length, request_id: req.requestId });
  });

  app.get('/api/v1/reports/audit-trail', requireRole(...AUDIT_ROLES), async (req, res) => {
    if (typeof store.reportAuditTrail !== 'function') return notImplemented(res, req);
    const range = parseRange(req, res);
    if (!range) return;
    const result = await store.reportAuditTrail({
      ...range,
      userId: req.query.user_id || undefined,
      page: req.query.page,
      pageSize: req.query.page_size,
    });
    return res.status(200).json({ ...result, request_id: req.requestId });
  });

  // Export CSV server-side: el contenido sale de las mismas agregaciones que
  // la pantalla, con los filtros activos — nunca de datos renderizados.
  app.get('/api/v1/reports/export', requireRole(...AUDIT_ROLES), async (req, res) => {
    if (typeof store.reportSummary !== 'function') return notImplemented(res, req);
    const range = parseRange(req, res);
    if (!range) return;
    const type = req.query.type === 'audit' ? 'audit' : 'summary';

    let csv;
    if (type === 'audit') {
      const audit = await store.reportAuditTrail({ ...range, userId: req.query.user_id || undefined, page: 1, pageSize: 100 });
      csv = toCsv(
        ['occurred_at', 'categoria', 'actor', 'actor_rol', 'accion', 'from_state', 'to_state', 'decision', 'recurso', 'recurso_id', 'detalle'],
        audit.items
      );
    } else {
      const summary = await store.reportSummary(range);
      const kpiRows = Object.entries(summary.kpis).map(([indicador, valor]) => ({ indicador, valor }));
      const zonaRows = summary.alertas_por_zona.map((r) => ({ indicador: `alertas_zona: ${r.zona}`, valor: r.alertas }));
      csv = toCsv(['indicador', 'valor'], [...kpiRows, ...zonaRows]);
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${type}-${stamp}.csv"`);
    return res.status(200).send(csv);
  });
}

module.exports = { registerReportRoutes, REPORT_VIEWER_ROLES, AUDIT_ROLES };
