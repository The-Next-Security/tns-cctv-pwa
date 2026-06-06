# PRD MVP CCTV — Parque Agrolivo

## Visión y outcomes

Visión:
Convertir la base actual de videovigilancia de Parque Agrolivo (cámaras + NVR + ANPR en recepción) en una operación de seguridad activa, trazable y gestionada, donde cada evento relevante tenga contexto, responsable, evidencia y seguimiento.

Outcomes del MVP:
- Disminuir la vigilancia pasiva: que los guardias trabajen con alertas priorizadas y no con monitoreo manual de grillas.
- Centralizar el evento operativo: detección, validación, decisión y evidencia en un único historial consultable.
- Conectar recepción con seguridad perimetral: unir patente/identidad declarada/destino con eventos de riesgo.
- Habilitar gestión administrativa: notificación oportuna, trazabilidad para auditoría y reportes base para toma de decisiones.

## Personas/usuarios

1) Guardia de recepción
- Registra ingreso de visitante/vehículo (nombre, identificador, destino, patente cuando aplique).
- Confirma o corrige patente capturada por ANPR.
- Necesita rapidez de registro y mínima fricción operativa.

2) Guardia de monitoreo / central
- Recibe alertas perimetrales/peatonales priorizadas.
- Atiende popup de cámara relevante y clasifica evento.
- Necesita reducir ruido y actuar con contexto.

3) Administración del parque
- Supervisa incidentes, reincidencias, tiempos de respuesta y estado operativo.
- Define reglas de escalamiento y destinatarios de notificaciones.
- Necesita evidencia consolidada para gestión y auditoría.

4) Arrendatario / empresa de destino (actor externo notificado)
- Recibe notificación por infracciones vehiculares vinculadas a visitas/proveedores asociados.
- Requiere información clara, verificable y oportuna.

## User stories priorizadas (MoSCoW)

### Must have (M)
M1. Como guardia de monitoreo, quiero recibir alertas priorizadas por zona/horario/criticidad para enfocarme en eventos accionables.

M2. Como guardia de monitoreo, quiero ver automáticamente la cámara asociada al evento para reducir tiempo de reacción.

M3. Como guardia de recepción, quiero registrar ingresos (ANPR/manual/híbrido) con datos mínimos obligatorios para asegurar trazabilidad vehicular.

M4. Como administración, quiero consultar historial unificado de eventos e ingresos con evidencia para auditar decisiones.

M5. Como administración, quiero recibir notificaciones de eventos críticos configurados para actuar en tiempo oportuno.

M6. Como administración, quiero detectar caídas de cámaras/NVR/integraciones para evitar puntos ciegos prolongados.

### Should have (S)
S1. Como administración, quiero correlacionar infracción de velocidad con ingreso reciente y empresa destino para identificar responsabilidad operativa.

S2. Como administración, quiero generar expediente de infracción (patente, velocidad, fecha/hora, evidencia, destino) para seguimiento.

S3. Como administración, quiero configurar reglas de escalamiento por tipo de evento y ventana horaria para adaptar la operación al parque.

### Could have (C)
C1. Como administración, quiero vistas resumidas por zona y franja horaria para identificar patrones de riesgo.

C2. Como administración, quiero métricas base de reincidencia por patente/empresa para prevención.

### Won’t have (W) en MVP
W1. Integraciones de sanción legal/formal externa automáticas.

W2. Analítica predictiva avanzada o modelos personalizados de IA fuera de las reglas ya operativas.

W3. Centro de despacho multi-sitio (más de un parque) en esta fase.

## Criterios de aceptación por story

M1
- Dado un evento IVS/IA válido, cuando ingresa al sistema, entonces se clasifica por zona, horario y criticidad según reglas activas.
- El guardia visualiza cola priorizada con estado (nuevo/en revisión/cerrado).
- El sistema permite descartar o escalar con motivo registrado.

M2
- Dado un evento priorizado, cuando se dispara alerta, entonces se abre visualización de la cámara/fuente asociada.
- El tiempo de acceso visual no depende de búsqueda manual en grilla.

M3
- El formulario de ingreso exige campos mínimos definidos (identificador persona, destino, timestamp; patente cuando corresponda).
- Si ANPR entrega patente parcial/ambigua, el guardia puede corregir y el sistema guarda fuente del dato (ANPR/manual/híbrido).
- Cada ingreso queda con identificador único y trazabilidad de edición.

M4
- Se puede consultar historial por rango de fecha, patente y tipo de evento.
- Cada evento relevante muestra: timestamp, cámara/zona, clasificación, decisión operativa y evidencia disponible.
- Los ingresos pueden vincularse a eventos por ventana temporal y/o patente.

M5
- Administración define qué eventos generan notificación y a qué destinatarios.
- Ante evento crítico configurado, se envía notificación con contexto mínimo (tipo, hora, zona, enlace al registro).
- Queda registro de envío/estado de notificación.

M6
- El sistema verifica periódicamente disponibilidad de fuentes críticas (cámaras/NVR/integración de eventos).
- Si una fuente crítica cae sobre umbral definido, se genera alerta técnica.
- Queda historial de incidentes técnicos y recuperación.

S1
- Dada una infracción de velocidad válida, el sistema intenta correlación con ingreso reciente por patente/ventana temporal.
- Si la correlación no es confiable, el caso queda en revisión manual (sin autoasignación forzada).

S2
- Toda infracción confirmada genera expediente con datos obligatorios: patente, velocidad, fecha/hora, evidencia y destino correlacionado (si existe).
- El expediente permite estado de seguimiento (pendiente/notificado/cerrado).

S3
- Administración puede activar/desactivar reglas por franja horaria y tipo de evento sin pérdida de trazabilidad.
- Cambios de regla quedan auditados con usuario/fecha.

C1
- Existe al menos una vista resumen por zona y horario con conteos de eventos y criticidad.

C2
- Existe ranking básico de reincidencia por patente y por empresa destino en periodo seleccionado.

## Alcance fuera del MVP

- Rediseño completo de infraestructura física del parque (el MVP parte de la base existente y reemplazos mínimos críticos).
- Automatización de procesos sancionatorios externos (municipales, judiciales o equivalentes).
- Entrenamiento de modelos de visión computacional propietarios para casos especiales.
- Cobertura multi-tenant/multi-parque con administración centralizada corporativa.
- BI avanzado con pronóstico de incidentes y optimización algorítmica.

## KPIs del MVP

KPIs operativos:
- % de eventos críticos atendidos dentro de SLA operativo definido.
- Tiempo medio desde detección a primera acción del guardia.
- Tasa de eventos descartados vs. escalados (calidad de priorización).

KPIs de trazabilidad:
- % de eventos con evidencia y decisión registrada completa.
- % de ingresos con datos mínimos completos.
- % de infracciones con expediente completo (cuando aplique).

KPIs de continuidad técnica:
- Disponibilidad de fuentes críticas integradas.
- Tiempo medio de detección de caída técnica.
- Tiempo medio de recuperación de integración crítica.

KPIs de gestión:
- % de notificaciones críticas enviadas correctamente.
- Tendencia de reincidencia por patente/empresa en periodos mensuales.

## Riesgos y supuestos

Supuestos:
- NVR1 y NVR2 son reutilizables para la operación objetivo del MVP.
- Existe conectividad Starlink estable para operar canal seguro saliente y sincronización de eventos.
- El flujo de recepción acepta disciplina de registro mínimo por parte de guardias.
- Se definirá umbral operativo de velocidad y política de notificación a arrendatarios antes del go-live de ese flujo.

Riesgos:
- Calidad de datos ANPR variable (escena/luz/ángulo), afectando correlación automática.
- Ruido de eventos si reglas iniciales no se calibran por zona/horario.
- Dependencia de continuidad de red para monitoreo remoto y notificaciones.
- Ambigüedad en responsabilidad cuando no exista match confiable patente-ingreso.
- Adopción operativa desigual entre turnos de guardia.

Mitigaciones funcionales (producto):
- Modo de revisión manual explícito para casos ambiguos.
- Auditoría de cambios de reglas y decisiones operativas.
- Fase de ajuste fino con métricas de ruido/efectividad antes de estabilización.
- Definición temprana de playbooks de uso y criterios de escalamiento.