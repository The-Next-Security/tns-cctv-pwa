// Test de regresión QA-13 (#54, sesión QA 2026-06-11): etiqueta de resolución.
// Bug real: las tarjetas resueltas pintaban "Resuelta: CONFIRMED" — el enum de
// decisión del SP se filtraba sin traducir a la UI (y attendAlert lo fosilizaba
// como comment_text cuando el operador no escribía nota). Contrato: la tarjeta
// muestra la nota del operador; sin nota, la decisión traducida; nunca el enum.
import { getResolutionLabel, RESOLUTION_DECISION_LABELS } from '../lib/types';

describe('Contrato QA-13 (#54): getResolutionLabel sin enums en inglés', () => {
  test('prioriza la nota del operador cuando existe', () => {
    expect(
      getResolutionLabel({
        resolution_notes: 'Incidente verificado y controlado.',
        resolution_decision: 'CONFIRMED',
      })
    ).toBe('Incidente verificado y controlado.');
  });

  test('sin nota, traduce la decisión del SP', () => {
    expect(getResolutionLabel({ resolution_notes: null, resolution_decision: 'CONFIRMED' })).toBe('confirmada');
    expect(getResolutionLabel({ resolution_notes: null, resolution_decision: 'FALSE_POSITIVE' })).toBe('falso positivo');
  });

  test('nota legacy igual al enum (datos previos al fix) también se traduce', () => {
    expect(getResolutionLabel({ resolution_notes: 'CONFIRMED', resolution_decision: 'CONFIRMED' })).toBe('confirmada');
  });

  test('sin nota ni decisión: "Sin notas" (nunca undefined ni enum)', () => {
    expect(getResolutionLabel({ resolution_notes: null, resolution_decision: null })).toBe('Sin notas');
    expect(getResolutionLabel({ resolution_notes: '  ', resolution_decision: undefined })).toBe('Sin notas');
  });

  test('toda decisión del SP tiene traducción en español', () => {
    for (const [decision, label] of Object.entries(RESOLUTION_DECISION_LABELS)) {
      expect(label).not.toBe(decision);
      expect(label).toMatch(/^[a-záéíóúñ ]+$/i);
    }
  });
});
