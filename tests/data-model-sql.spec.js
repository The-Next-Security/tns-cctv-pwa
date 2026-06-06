const fs = require('fs');
const path = require('path');

const SQL_ROOT = path.join(__dirname, '..', 'db', 'sql_files');
const EXPECTED_FILES = [
  '00_setup.sql',
  '01_ddl.sql',
  '02_indices.sql',
  '03_seed_inserts.sql',
  '04_procedures.sql',
  '05_functions.sql',
  '06_events.sql',
  '07_logs.sql',
  'README.md',
];

describe('SQL_FILES structure for MySQL 8 data model', () => {
  test('exposes the requested SQL bundle layout', () => {
    for (const fileName of EXPECTED_FILES) {
      const filePath = path.join(SQL_ROOT, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('splits the canonical schema across the requested domains', () => {
    const ddl = fs.readFileSync(path.join(SQL_ROOT, '01_ddl.sql'), 'utf8');
    const logs = fs.readFileSync(path.join(SQL_ROOT, '07_logs.sql'), 'utf8');

    expect(ddl).toContain('SET NAMES utf8mb4;');
    expect(ddl).toContain("SET time_zone = '+00:00';");
    expect(ddl).toContain('CREATE TABLE tenants (');
    expect(ddl).toContain('CREATE TABLE events (');
    expect(ddl).toContain('CREATE TABLE speed_cases (');
    expect(logs).toContain('CREATE TABLE api_audit_log (');
  });
});
