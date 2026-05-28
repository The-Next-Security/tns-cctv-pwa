# Streaming Strategy — WebRTC vs HLS (MVP CCTV)

## 1. Objetivo

Definir estrategia de video para:
- Popup operativo inmediato al guardia (M3).
- Visualización estable para administración y monitoreo.
- Compatibilidad con red variable (Starlink) y dispositivos heterogéneos.

Criterio principal: separar “tiempo real de reacción” de “consumo estable/escalable”.

## 2. Decisión técnica

Se implementa estrategia híbrida:
- WebRTC para popup y vistas operativas de baja latencia.
- HLS/LL-HLS para monitoreo continuo, historial y clientes con restricciones.

Servidor de medios recomendado para MVP: MediaMTX
- Soporta ingest RTSP y salida WebRTC + HLS con configuración simple.
- Menor complejidad para MVP frente a cluster SFU dedicado.

## 3. Matriz por tipo de cliente

1) Guardia de turno (desktop recepción/portería)
- Canal primario: WebRTC.
- Objetivo: latencia extremo a extremo ~500ms–1.5s.
- Uso: popup automático por evento crítico y vista táctica inmediata.
- Fallback: LL-HLS (si falla negociación ICE o red corporativa bloquea UDP).

2) Administración (web/PWA desktop)
- Canal primario: HLS/LL-HLS.
- Objetivo: estabilidad y menor consumo de recursos cliente.
- Uso: revisión de cámaras, historial y auditoría visual.
- Fallback: snapshot + botón “abrir en WebRTC” para casos urgentes.

3) Móvil PWA
- Canal primario: HLS.
- Razón: WebRTC en móvil puede degradar batería/datos y variar por browser.
- Excepción: WebRTC bajo demanda para incidente crítico puntual.

4) Operador TNS (soporte)
- Canal mixto:
  - HLS para observación general.
  - WebRTC para diagnóstico puntual de latencia/fuente.

## 4. Flujo de streaming en arquitectura

1. Cámara/NVR publica RTSP en red local parque.
2. Edge gateway/connector expone/replica stream hacia media server cloud por túnel seguro saliente.
3. Media server genera:
   - stream WebRTC de baja latencia.
   - playlist HLS/LL-HLS para consumo masivo/estable.
4. Backend emite en WS el stream_hint (webrtc/hls) según contexto y cliente.
5. Frontend solicita token de reproducción efímero antes de abrir stream.

## 5. Selección dinámica de protocolo

Reglas en frontend:
- Si evento es crítico y cliente guardia online -> intentar WebRTC primero.
- Si negociación tarda >2.5s -> fallback a LL-HLS.
- Si cliente móvil o sesión de historial -> iniciar en HLS.
- Si red detectada inestable (loss alto) -> degradar calidad o fijar HLS.

Pseudoregla:
- mode=popup_critical AND role=GUARD => WebRTC
- mode=monitoring OR role=ADMIN => HLS
- mode=history_playback => HLS/MP4 clip

## 6. Trade-offs explícitos

WebRTC
- Pros: latencia mínima, ideal para reacción operativa.
- Contras: complejidad ICE/TURN, consumo CPU, sensibilidad de red.
- Uso MVP: acotado a popup + sesiones puntuales.

HLS/LL-HLS
- Pros: robustez, cacheable, simple en browsers y móvil.
- Contras: más latencia que WebRTC (2–6s típico, LL-HLS menor).
- Uso MVP: monitoreo continuo, historial y fallback universal.

Decisión final:
- No forzar “todo WebRTC”.
- Optimizar experiencia operativa con WebRTC donde entrega valor real (M3).

## 7. Requerimientos de red y componentes

- STUN/TURN gestionado (TURN obligatorio para entornos restrictivos).
- TLS extremo a extremo para señalización y URLs de playlist.
- Salida del parque siempre iniciada desde edge (sin inbound abierto).
- QoS mínimo recomendado en sitio para flujo crítico guardia.

## 8. Seguridad del stream

- Tokens JWT de reproducción de corta vida (60–120s para obtener sesión).
- Autorización por tenant/site/camera + rol.
- URLs firmadas para HLS y evidencia.
- Revocación por cierre de sesión o cambio de rol.
- Watermark opcional posterior al MVP para evidencias sensibles.

## 9. Observabilidad de streaming

Métricas:
- stream_start_time_seconds (por protocolo).
- webrtc_connect_success_ratio.
- hls_rebuffer_ratio.
- playback_error_rate.
- active_stream_sessions por rol.

Alertas:
- webrtc_connect_success_ratio < 90% en 15 min.
- stream_start_time_seconds p95 > 3s guardia popup.
- error_rate > 5% por cámara/zona.

## 10. Plan de implementación por fases

Fase MVP-1:
- Ingest RTSP + salida HLS funcional para todas las cámaras críticas.

Fase MVP-2:
- Activar WebRTC en subset de cámaras prioritarias (portería/perímetro).

Fase MVP-3:
- Ajuste adaptativo de bitrate/resolución por tipo de cliente.

## 11. Criterios de aceptación (streaming)

- Popup crítico abre video operativo en guardia con p95 < 3s (WebRTC preferente o fallback LL-HLS).
- Administración puede visualizar HLS estable en escritorio y móvil.
- Si WebRTC falla, usuario mantiene continuidad con fallback automático sin perder contexto del evento.
