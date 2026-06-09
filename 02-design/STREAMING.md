# STREAMING.md

## Objetivo

Este documento describe la estrategia de streaming que realmente existe hoy en la aplicacion. La respuesta corta es: no hay stack de streaming operacional; hoy existe una simulacion visual de snapshot y video demo.

## Estado real actual

### Snapshot

Archivos fuente:
- `lib/demo-media.ts`
- `components/operacion/alert-dialog.tsx`
- `components/operacion/alert-popup.tsx`
- `app/(dashboard)/operacion/alerta/[id]/page.tsx`

Comportamiento real:
- los snapshots salen de assets demo bajo `/demo/*`
- `resolveSnapshotUrl(...)` decide la imagen
- no existe firma backend de snapshot en la UI principal
- no existe fetch a NVR ni object storage real desde estas pantallas

### Video

Archivos fuente:
- `components/operacion/live-camera-panel.tsx`
- `lib/demo-media.ts`

Comportamiento real:
- el panel reproduce un `mp4` local en loop
- URL por defecto: `/demo/live-feed-loop.mp4`
- autoplay, loop, muted, playsInline
- el texto "Dahua · Stream demo" esta hardcodeado en la UI

Conclusion:
- hoy no hay WebRTC
- hoy no hay HLS
- hoy no hay negociacion de sesion
- hoy no hay bridge con NVR ni con un media server

## Superficies UI que consumen video demo

### `AlertDialog`

Tiene tabs:
- `Snapshot`
- `Video`

El tab `Video` monta `LiveCameraPanel`.

### `AlertPopup`

Tambien tiene tabs:
- `Snapshot`
- `Video`

Tambien monta `LiveCameraPanel`.

### Detalle de alerta

`app/(dashboard)/operacion/alerta/[id]/page.tsx` hoy muestra snapshot, pero no negocia una sesion de stream ni ofrece WebRTC/HLS real.

## Endpoints de streaming reales

No existen hoy en el backend:
- `POST /api/v1/events/{event_id}/stream-session`
- `POST /api/v1/streams/webrtc/offer`
- playlists HLS
- signed URLs de video operacional

Lo mas cercano a evidencia real es:
- `POST /api/v1/evidence/sign` en `backend/src/app.js`

Pero ese endpoint solo firma un `object_url`; no entrega una sesion de streaming.

## Realtime y streaming no estan integrados

La app si tiene conceptos de realtime visual, pero hoy estan desconectados del video:

- frontend espera `socket.io` en `/realtime`
- backend real ofrece `ws` en `/ws/operations`
- el evento realtime real hoy es `event.popup`
- ese evento no abre ni negocia ningun stream

## Que si esta resuelto hoy

1. La UX visual de cambiar entre snapshot y video demo.
2. El layout responsive del panel.
3. La presentacion de overlays operacionales:
   - reloj
   - badge "EN VIVO"
   - nombre de camara
   - fps demo

## Que no esta resuelto hoy

1. Transporte de video real.
2. Fallback entre protocolos.
3. Session tokens de media.
4. Control de acceso por tenant/rol sobre video.
5. Degradacion operacional medida con metricas reales.
6. Integracion con Dahua HTTP API o RTSP/RTMP.

## Lectura tecnica correcta

Hoy la "capa de streaming" del producto es realmente una capa de demo media:
- snapshot demo
- clip demo
- UI ya preparada para alojar un stream real

Eso sirve para validacion UX, no para operacion CCTV en produccion.

## Siguiente paso natural si se implementa de verdad

1. Elegir protocolo real por caso de uso: WebRTC o HLS.
2. Implementar backend de sesion de media.
3. Vincular `event_id` con evidencia y stream source reales.
4. Reemplazar `demo-media.ts` por resolucion de media autenticada.

---
Ultima actualizacion basada en codigo: 2026-06-09
