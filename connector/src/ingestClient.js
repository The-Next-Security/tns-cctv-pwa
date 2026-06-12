// Cliente HTTP hacia POST /api/v1/ingest/events (auth máquina-a-máquina x-api-key).
// Reintenta errores transitorios (red / 5xx) con backoff; 4xx no se reintenta.
const RETRYABLE_DELAYS_MS = [500, 2000, 5000];

function createIngestClient({ baseUrl, apiKey, fetchImpl = fetch, log = console }) {
  if (!baseUrl) throw new Error('baseUrl requerido');
  if (!apiKey) throw new Error('apiKey requerido (x-api-key del conector)');

  async function send({ idempotencyKey, payload }) {
    let lastError;
    for (let attempt = 0; attempt <= RETRYABLE_DELAYS_MS.length; attempt++) {
      try {
        const res = await fetchImpl(`${baseUrl}/api/v1/ingest/events`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 202) return res.json();
        if (res.status === 409) {
          log.warn(`[ingest] conflicto de idempotencia para ${idempotencyKey}`);
          return null;
        }
        if (res.status >= 400 && res.status < 500) {
          const body = await res.text();
          throw Object.assign(new Error(`ingest rechazado (${res.status}): ${body}`), { permanent: true });
        }
        lastError = new Error(`ingest respondió ${res.status}`);
      } catch (error) {
        if (error.permanent) throw error;
        lastError = error;
      }

      if (attempt < RETRYABLE_DELAYS_MS.length) {
        await new Promise(resolve => setTimeout(resolve, RETRYABLE_DELAYS_MS[attempt]));
      }
    }
    throw lastError;
  }

  // M6: señal de vida de la fuente. Best-effort con log: si falla, el backend
  // degradará el estado del NVR por antigüedad del último heartbeat.
  async function sendHeartbeat(sourceId) {
    try {
      const res = await fetchImpl(`${baseUrl}/api/v1/ingest/heartbeat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ source_id: sourceId }),
      });
      if (res.status !== 200) log.warn(`[heartbeat] backend respondió ${res.status} para ${sourceId}`);
    } catch (error) {
      log.warn(`[heartbeat] no entregado para ${sourceId}: ${error.message}`);
    }
  }

  return { send, sendHeartbeat };
}

module.exports = { createIngestClient };
