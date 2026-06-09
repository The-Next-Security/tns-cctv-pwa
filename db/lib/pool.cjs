const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let pool = null;

function loadConfig() {
  const configPath = path.resolve(__dirname, '..', 'connection-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(
      'db/connection-config.json no existe. Copia db/connection-config.template.json y completa las credenciales.'
    );
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const envKey = raw.environment === 1 ? 'production' : 'development';
  const cfg = raw[envKey];
  if (!cfg) throw new Error(`Sección "${envKey}" ausente en connection-config.json`);
  return cfg;
}

function getPool() {
  if (pool) return pool;
  const cfg = loadConfig();
  pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: cfg.pool?.max_size ?? 10,
    timezone: 'Z',
    charset: 'utf8mb4',
    dateStrings: true,
  });
  return pool;
}

module.exports = { getPool, loadConfig };
