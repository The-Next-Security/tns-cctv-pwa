# STREAMING.md

<!-- ARC_TASK:t_57457627 -->

## 1. Objetivo
Definir estrategia de video para el MVP según tipo de cliente y criticidad operacional, usando WebRTC y HLS sin ampliar alcance fuera del PRD.

## 2. Estrategia por tipo de cliente
| Cliente/escenario | Protocolo primario | Fallback | Meta latencia |
|---|---|---|---|
| Guardia - popup crítico (M12) | WebRTC | HLS -> snapshot | 0.5s-2s |
| Guardia/Admin - detalle evento (M5) | HLS | snapshot/clip | 6s-12s |
| Admin - historial/auditoría | HLS | descarga clip | no crítico realtime |
| OPS - verificación de fuente (M11) | snapshot bajo demanda | HLS | no crítico realtime |
| Navegador móvil PWA | HLS | snapshot | 6s-15s |

## 3. Decisión MVP
1) WebRTC acotado a popup operativo crítico.
2) HLS para revisión e historial.
3) Snapshot/clip firmado como baseline obligatorio.

Rationale:
- WebRTC para todos los casos elevaría complejidad (TURN/NAT/costo) sin beneficio proporcional en MVP.

## 4. Flujo operativo
1. WS `event.popup` llega al cliente.
2. Front solicita sesión de stream para `event_id`.
3. Intenta WebRTC (timeout corto, p.ej. 2-3s).
4. Si falla, fallback automático a HLS.
5. Si HLS falla, mostrar snapshot firmado y registrar degradación.

## 5. Contratos auxiliares de streaming
### POST /api/v1/events/{event_id}/stream-session
Response ejemplo:
```json
{
  "event_id":"evt_01",
  "preferred_protocol":"WEBRTC",
  "webrtc":{
    "offer_endpoint":"/api/v1/streams/webrtc/offer",
    "ice_servers":[{"urls":["stun:stun.l.google.com:19302"]}],
    "token":"strm_tok_...",
    "expires_at":"2026-05-28T19:06:00Z"
  },
  "hls":{
    "playlist_url":"https://.../index.m3u8?sig=...",
    "expires_at":"2026-05-28T19:06:00Z"
  },
  "snapshot":{"url":"https://.../frame.jpg?sig=..."}
}
```

### POST /api/v1/streams/webrtc/offer
Request:
```json
{"event_id":"evt_01","sdp_offer":"v=0...","token":"strm_tok_..."}
```
Response:
```json
{"sdp_answer":"v=0...","expires_at":"2026-05-28T19:06:00Z"}
```

## 6. Seguridad
- URLs HLS/snapshot firmadas y expirables.
- Token efímero WebRTC scope: tenant_id + user_id + event_id.
- RBAC previo a credenciales de stream.
- Nunca exponer endpoint directo de NVR/cámara a cliente.

## 7. Observabilidad de streaming
Métricas:
- `stream_webrtc_connect_success_ratio`
- `stream_webrtc_connect_time_ms`
- `stream_fallback_to_hls_ratio`
- `stream_hls_startup_time_ms`
- `stream_snapshot_fallback_ratio`

Alertas:
- Aumento sostenido fallback WebRTC->HLS.
- Fallas HLS sobre umbral.

## 8. Límites MVP
Fuera de alcance:
- VMS completo multi-cámara low-latency para todos los perfiles.
- Optimización adaptativa avanzada de bitrate multi-perfil.
- Analítica de video en tiempo real fuera de eventos PRD.