// Test de regresión QA-03 (sesión QA 2026-06-11): clasificación de urgencia.
// PRD-PRODUCTO.md §5.3 — getAlertClass: 'critica' = severidad alta o crítica;
// 'baja_prioridad' = media o baja. Un bug en la UI degradaba las alertas 'alta'
// a "Baja prioridad" (no contaban como críticas ni disparaban el tratamiento
// de atención inmediata). Esta suite falla si el mapeo vuelve a divergir del PRD.
import { getAlertClass } from '../lib/types';

describe('Contrato PRD §5.3: getAlertClass', () => {
  test.each([
    ['critica', 'critica'],
    ['alta', 'critica'],
    ['media', 'baja_prioridad'],
    ['baja', 'baja_prioridad'],
  ])("criticidad '%s' → clase '%s'", (criticality, expected) => {
    expect(getAlertClass(criticality)).toBe(expected);
  });
});
