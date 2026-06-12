# Conector edge TNS CCTV ⇄ NVR Dahua

Proceso Node **independiente** (decisión D8) que se suscribe al stream de eventos
de los NVR Dahua (HTTP API V3.26) y los publica en `POST /api/v1/ingest/events`
con autenticación máquina-a-máquina (`x-api-key`).

## Arquitectura

```
NVR Dahua ──(HTTP Digest RFC 7616)──▶ snapManager.cgi attachFileProc
   │ multipart/x-mixed-replace (eventos texto + snapshots JPEG + heartbeats)
   ▼
multipartParser ─▶ dahuaEvents (normaliza canal 0→1-based) ─▶ eventMapper (mapping.json)
   ▼
ingestClient ──(x-api-key + x-idempotency-key)──▶ backend /api/v1/ingest/events
```

| Módulo | Responsabilidad |
|---|---|
| `src/multipartParser.js` | Parser streaming multipart (chunks parciales, JPEG binario) |
| `src/dahuaEvents.js` | Parseo de eventos (snapManager y eventManager) + normalización de canal — **único punto** (spec §3.5.1) |
| `src/digestAuth.js` | HTTP Digest RFC 7616 (401 → calcular → reintentar) |
| `src/eventMapper.js` | mapping.json + idempotency-key = sha256(nvr, canal, código, PTS) |
| `src/ingestClient.js` | POST al ingest con reintentos (5xx/red); 4xx no se reintenta |
| `src/nvrConnection.js` | Conexión por NVR, asociación evento↔snapshot, reconexión backoff |

## Uso

```bash
cp connector/config.template.json connector/config.json   # completar credenciales NVR
INGEST_API_KEY=<clave> node connector/src/index.js        # o ingest.apiKey en config.json
```

`config.json` y `snapshots/` están **gitignored** (credenciales NVR en config local).

## Estado vs hito 25-jun

- ✅ Parser + mapper + digest + cliente desarrollados en loop cerrado contra fixtures
  sintéticos según spec (tests en `tests/connector.*.spec.js`).
- ⏳ **Spike contra hardware real pendiente** (1 día, requiere acceso físico):
  validar los 3 endpoints contra el firmware del parque y **grabar golden files**
  que reemplacen los fixtures sintéticos. Desviaciones firmware-vs-spec → `LECCIONES.md`.
- ⏳ `attachCameraState` (online/offline cámaras, alimenta M6) — segunda iteración.
- ⏳ Snapshots: hoy se persisten en disco local con URI `file://`; integración con
  `dah_snapshot`/`ale_evidencia` y resolución de media real reemplaza a `demo-media.ts`.
