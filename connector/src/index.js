// Entrada del conector edge TNS CCTV ⇄ NVR Dahua (proceso independiente, D8).
// Uso: node connector/src/index.js [ruta-config]
// Config real en connector/config.json (gitignored) — ver config.template.json.
const fs = require('fs');
const path = require('path');
const { createEventMapper } = require('./eventMapper');
const { createIngestClient } = require('./ingestClient');
const { createNvrConnection } = require('./nvrConnection');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const configPath = process.argv[2] ?? path.join(__dirname, '..', 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`No existe ${configPath}. Copie config.template.json a config.json y complete credenciales.`);
    process.exit(1);
  }
  const config = loadJson(configPath);
  const mapping = loadJson(path.join(__dirname, '..', 'mapping.json'));

  const apiKey = process.env.INGEST_API_KEY ?? config.ingest.apiKey;
  if (!apiKey) {
    console.error('FATAL: falta la api key del ingest (INGEST_API_KEY o ingest.apiKey).');
    process.exit(1);
  }

  const ingestClient = createIngestClient({ baseUrl: config.ingest.baseUrl, apiKey });
  const connections = config.nvrs.map(nvr => {
    const mapper = createEventMapper({
      mapping,
      nvr,
      tenantId: config.tenantId,
      siteId: config.siteId,
    });
    return createNvrConnection({
      nvr,
      mapper,
      ingestClient,
      snapshotDir: config.snapshotDir ?? path.join(__dirname, '..', 'snapshots'),
    });
  });

  connections.forEach(connection => connection.start());
  console.log(`Conector iniciado: ${connections.length} NVR(s).`);

  const shutdown = () => {
    console.log('Deteniendo conector...');
    connections.forEach(connection => connection.stop());
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
