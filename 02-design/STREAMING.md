# STREAMING.md

## Objetivo

Describe la estrategia de streaming y media **que realmente existe hoy**. No documenta WebRTC/HLS objetivo del PRD.

---

## Respuesta corta

**No hay stack de streaming operacional.** Existe simulación visual con assets demo locales (snapshot JPG + MP4 en loop).

---

## Estado actual

### Snapshots

**Archivos:**
- `lib/demo-media.ts` — `resolveSnapshotUrl()`, mapeo por tipo de evento/zona
- `components/operacion/alert-dialog.tsx`
- `components/operacion/alert-popup.tsx`
- `components/operacion/alert-card.tsx`

**Comportamiento:**
- Imágenes desde `/public/demo/*.jpg`
- `mysqlStore.mapAlertRow()` devuelve `snapshot_url: null` — no hay fetch a `dah_snapshot` ni NVR
- Sin firma backend de snapshot en UI principal

### Video en vivo (simulado)

**Archivos:**
- `components/operacion/live-camera-panel.tsx`
- `lib/demo-media.ts`

**Comportamiento:**
- Reproduce `/demo/live-feed-loop.mp4`
- `autoplay`, `loop`, `muted`, `playsInline`
- Overlay UI: reloj, badge "EN VIVO", nombre cámara, fps demo
- Texto "Dahua · Stream demo" hardcodeado

**No existe:**
- WebRTC / HLS / RTSP / RTMP
- Negociación de sesión de media
- Bridge con NVR Dahua HTTP API
- Control de acceso por tenant/rol sobre stream

---

## Superficies UI con tabs Snapshot / Video

| Componente | Tabs | Stream |
|------------|------|--------|
| `AlertDialog` | Snapshot, Video | `LiveCameraPanel` |
| `AlertPopup` | Snapshot, Video | `LiveCameraPanel` |
| `/operacion/alerta/[id]` | Snapshot principal | Sin video (página además rota sin GET alert) |

---

## Endpoints de streaming

**No implementados:**
- `POST /api/v1/events/{event_id}/stream-session`
- `POST /api/v1/streams/webrtc/offer`
- Playlists HLS
- Signed URLs de video operacional

**Referencia no integrada:**
- `POST /api/v1/evidence/sign` en `backend/src/app.js` (PoC) — firma `object_url`, no sesión de streaming.

---

## Modelo SQL relacionado (sin consumidor)

Tablas preparadas para evidencia real:
- `dah_snapshot`
- `dah_archivo_grabacion`
- `ale_evidencia`

Sin servicio runtime que las pueble ni exponga a la UI.

---

## Realtime vs streaming

Desacoplados hoy:

| Canal | Qué hace | Qué NO hace |
|-------|----------|-------------|
| WS `event.popup` | Notifica nuevo evento; UI refetch alertas | No abre stream |
| `LiveCameraPanel` | Muestra MP4 demo | No reacciona a eventos WS |

---

## Virtudes (para demo/UX)

1. Layout responsive del panel de video listo para stream real.
2. Tabs Snapshot/Video consistentes en dialog y popup.
3. Overlays operacionales (EN VIVO, timestamp) validan UX objetivo.
4. `demo-media.ts` centraliza resolución de assets — punto único de reemplazo futuro.

---

## Defectos

1. **Cero integración CCTV real** — no apto operación en producción.
2. **Evidencia BD ignorada** — `dah_*` sin pipeline.
3. **Detalle alerta sin media dinámica** por evento real.
4. **Sin fallback de protocolo** (WebRTC → HLS).
5. **Sin TTL/auth en URLs de media**.
6. **Expectativa vs realidad** — UI dice "EN VIVO" con clip pregrabado.

---

## Siguiente paso natural (referencia, no comprometido)

1. Elegir protocolo: WebRTC (baja latencia) vs HLS (simplicidad).
2. Implementar backend de sesión vinculado a `event_id` + `src_fuente`.
3. Poblar `dah_snapshot` desde NVR en ingest.
4. Reemplazar `demo-media.ts` por resolución autenticada.
5. Integrar `evidence/sign` o equivalente en `src/`.

---

**Última actualización basada en código:** 2026-06-11
