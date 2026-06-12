// Test de regresión QA-09 (#50, sesión QA 2026-06-11): resolution_notes.
// Bug real: mapAlertRow exponía ale_evento.decision_reason (la decisión del SP,
// p. ej. "CONFIRMED") como resolution_notes; la nota escrita por el operador
// vivía solo en el comment del último CLOSED de log_evento_timeline y nunca
// llegaba a la UI. Contrato: resolution_notes = comment del último CLOSED;
// la decisión del SP se expone aparte como resolution_decision.
const { mapAlertRow } = require('../src/mysqlStore.cjs');

function baseRow(overrides = {}) {
  return {
    id_evento: 'EV000000000000000000000001',
    external_event_id: 'ext_qa09',
    id_fuente: 'SN000000000000000000000001',
    matched_rule_ids_json: null,
    zone_code: 'zone-1',
    event_type: 'CrossRegionDetection',
    severity: 4,
    state: 'CLOSED',
    occurred_at: '2026-06-11 20:00:00.000',
    creado_en: '2026-06-11 20:00:00.000',
    plate: null,
    decision_reason: 'CONFIRMED',
    close_decision: 'CONFIRMED',
    close_comment: 'QA: incidente verificado y controlado.',
    llamada_at: null,
    ...overrides,
  };
}

describe('Contrato QA-09 (#50): resolution_notes es la nota del operador', () => {
  test('resolution_notes devuelve el comment del último CLOSED, no la decisión', () => {
    const alert = mapAlertRow(baseRow());
    expect(alert.resolution_notes).toBe('QA: incidente verificado y controlado.');
    expect(alert.resolution_notes).not.toBe('CONFIRMED');
  });

  test('la decisión del SP se expone aparte como resolution_decision', () => {
    const alert = mapAlertRow(baseRow());
    expect(alert.resolution_decision).toBe('CONFIRMED');
  });

  test('sin comment en el cierre, resolution_notes es null (nunca el enum)', () => {
    const alert = mapAlertRow(baseRow({ close_comment: null }));
    expect(alert.resolution_notes).toBeNull();
    expect(alert.resolution_decision).toBe('CONFIRMED');
  });

  test('alerta sin cerrar: ambos campos null', () => {
    const alert = mapAlertRow(
      baseRow({ state: 'NEW', decision_reason: null, close_decision: null, close_comment: null })
    );
    expect(alert.resolution_notes).toBeNull();
    expect(alert.resolution_decision).toBeNull();
  });
});
