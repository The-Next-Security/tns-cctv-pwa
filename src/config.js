// Configuración crítica del backend. Decisión D7 (PRD-V2): los secretos
// hacen fail-fast — en producción sin JWT_SECRET el proceso NO arranca.

function resolveJwtSecret(env = process.env) {
  if (env.JWT_SECRET && env.JWT_SECRET.trim() !== '') return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL (D7): JWT_SECRET no está definido. En producción el proceso no arranca sin secreto. ' +
      'Defina JWT_SECRET en el entorno antes de iniciar.'
    );
  }
  return 'dev-secret';
}

function resolveIngestApiKey(env = process.env) {
  if (env.INGEST_API_KEY && env.INGEST_API_KEY.trim() !== '') return env.INGEST_API_KEY;
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL (D7): INGEST_API_KEY no está definido y el store no valida api keys por BD. ' +
      'Defina INGEST_API_KEY o use el store MySQL con src_conector_edge.api_key_hash.'
    );
  }
  return 'dev-ingest-key';
}

module.exports = { resolveJwtSecret, resolveIngestApiKey };
