// Test de regresión QA-04 (sesión QA 2026-06-11): timezone de sesión MySQL.
// Bug real: NOW()/CURRENT_TIMESTAMP y los DEFAULT de las tablas escribían en el
// timezone del SO (GMT-4) mientras occurred_at llegaba en UTC — la misma tabla
// (log_evento_timeline) mezclaba husos y el orden cronológico quedaba corrupto
// (IN_REVIEW aparecía 4 h "antes" que NEW). El pool DEBE fijar la sesión en UTC.
const fs = require('fs');
const path = require('path');

describe('Contrato QA-04: sesión MySQL en UTC', () => {
  const poolSrc = fs.readFileSync(path.join(__dirname, '..', 'db', 'lib', 'pool.cjs'), 'utf8');

  test("el pool fija SET time_zone = '+00:00' al crear cada conexión", () => {
    expect(poolSrc).toMatch(/SET time_zone = '\+00:00'/);
    expect(poolSrc).toMatch(/on\(\s*'connection'/);
  });

  test("el pool mantiene timezone 'Z' y dateStrings para serialización estable", () => {
    expect(poolSrc).toMatch(/timezone:\s*'Z'/);
    expect(poolSrc).toMatch(/dateStrings:\s*true/);
  });
});
