// D7 (PRD-V2): fail-fast de secretos — sin JWT_SECRET en producción no se arranca.
const { resolveJwtSecret } = require('../src/config');

describe('resolveJwtSecret (D7 fail-fast)', () => {
  test('en producción sin JWT_SECRET lanza error y el proceso no arranca', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  test('en producción con JWT_SECRET vacío también falla', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: '   ' })).toThrow(/JWT_SECRET/);
  });

  test('en producción con JWT_SECRET definido lo usa', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 's3creto' })).toBe('s3creto');
  });

  test('en desarrollo sin JWT_SECRET usa el secreto de desarrollo', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development' })).toBe('dev-secret');
  });
});
