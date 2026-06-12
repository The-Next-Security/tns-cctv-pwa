# PLAN — Plano interactivo del parque en /operacion (Agrolivo)

> **Estado:** Diseño aprobado en brainstorming — listo para implementar
> **Fecha de diseño:** 2026-06-12
> **Rama sugerida:** `feat/plano-operacion` (crear desde `dev`)
> **Fuente del plano:** PDF en OneDrive — `AA_TNS/The Next Security 2024-25-26/TNS TRACK/Clientes/Parque Agrolivo/DISTRIBUCION_CAMARAS _AGROLIVO-PDF.pdf`

## Contexto

El operador de la consola CCTV hoy solo ve las alertas como lista: sabe **qué** pasó pero no **dónde** de un vistazo. Existe un plano oficial de distribución de cámaras del Parque Agrolivo (PDF). La idea es incorporarlo como guía visual de alertas activas en el área `/operacion`, tanto en el resumen como en la alerta individual.

### Decisiones tomadas con el usuario (brainstorming 2026-06-12)

1. **Granularidad:** zonas delimitadas + cámaras posicionadas (la alerta ilumina la zona y marca la cámara origen).
2. **Base del plano:** imagen exportada del PDF como fondo + capa SVG vectorial encima (zonas y cámaras). No se redibuja el plano en v1.
3. **Coordenadas:** archivo de configuración estático TS trazado por nosotros (sin editor admin en v1). Coordenadas normalizadas 0–100 (%) sobre la imagen, reutilizables si después se redibuja la base.
4. **Resumen `/operacion`:** mini-mapa siempre visible arriba del panel de contexto derecho; zonas se encienden según alertas activas; clic en zona filtra la lista (reutiliza `zoneFilter` existente); botón expandir abre el plano grande en un Dialog.
5. **Detalle `/operacion/alerta/[id]`:** tarjeta "Ubicación" en la columna derecha (bajo acciones), enfocada (zoom) en la zona de la alerta con la cámara origen pulsando; el snapshot conserva su tamaño completo.
6. **Popup prioritario:** se incluye un mini-localizador compacto en `AlertPopup`/`AlertDialog` (mismo componente, variante locator).

## Arquitectura

### Asset del plano
- Exportar la página del PDF a imagen (`public/plano/distribucion-camaras-agrolivo.webp`, ~1600–2000px de ancho; en macOS usar `sips`/Quartz o ImageMagick si está disponible). Verificar legibilidad antes de continuar.

### Datos — `lib/park-map.ts` (nuevo)
- `PARK_MAP_IMAGE`: ruta del asset + dimensiones intrínsecas (para aspect-ratio).
- `MAP_ZONES`: polígono por zona, **keyed por `code` de `PARK_ZONES`** (`lib/constants.ts:149`, `zone-1`…`zone-8`) — no por id numérico, porque los ids de UI son surrogate del backend. Puntos normalizados 0–100.
- `MAP_CAMERAS`: posición `{x, y}` por cámara, keyed por nombre/código estable de cámara; se resuelve contra las cámaras cargadas en runtime.
- Helpers: `resolveAlertZoneCode(alert)` (usa `alert.zone` → fallback `alert.camera.zone`), `zoneBoundingBox(points, padding)` para el zoom del locator.

### Componente central — `components/operacion/park-map.tsx` (nuevo)
`ParkMap` con props: `alerts: Alert[]`, `variant: 'mini' | 'full' | 'locator'`, `focusZoneCode?`, `focusCameraId?`, `onZoneClick?(zoneCode)`, `className?`.

- Render: contenedor con aspect-ratio del plano → `next/image` del plano + `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` superpuesto.
- **Zonas:** polígonos con tinte según la alerta activa de mayor criticidad en la zona, usando los estilos de urgencia existentes (`URGENCY_STYLES` / tokens `--urgency-*` y `ds-signal`); zonas sin alertas solo borde sutil. Nunca colores Tailwind raw.
- **Cámaras:** puntos pequeños; con alerta activa → color signal + animación de pulso (patrón `badge-urgency-critical-pulse` existente); `focusCameraId` → anillo destacado.
- **Variante `locator`:** zoom a la zona foco vía `transform: scale/translate` calculado del bounding box del polígono (wrapper `overflow-hidden`).
- **Interacción:** zonas clickeables solo si llega `onZoneClick` (mini/full); accesibilidad con `aria-label` por zona; touch targets adecuados en móvil.

### Dialog expandido — `components/operacion/park-map-dialog.tsx` (nuevo)
Usa `Dialog` de `components/ui/dialog`. Plano grande (`variant='full'`) + leyenda de criticidad + contador de alertas por zona. Clic en zona → `onZoneClick` (filtra y cierra). Full-screen en móvil.

## Integraciones (archivos a modificar)

1. **`components/dashboard/operacion-context-panel.tsx`** — agregar tarjeta "Mapa del parque" al tope: `ParkMap variant='mini'` + botón expandir (icono lucide, `aria-label`) que abre `ParkMapDialog`. Nueva prop opcional `onZoneSelect`.
2. **`app/(dashboard)/operacion/page.tsx`** — pasar `onZoneSelect` al context panel conectado a `setZoneFilter` (estado ya existente que alimenta `AlertsFilterBar`).
3. **`app/(dashboard)/operacion/alerta/[id]/page.tsx`** — Card "Ubicación" en la columna derecha con `ParkMap variant='locator'` enfocado en la zona/cámara de la alerta. Si la alerta no tiene zona mapeada, la tarjeta no se muestra (degradación silenciosa).
4. **`components/operacion/alert-popup.tsx`** y **`components/operacion/alert-dialog.tsx`** — mini-localizador compacto (`variant='locator'`, sin interacción) junto a la info de zona.

## Reglas del proyecto a respetar
- Design system: tokens `ds-*` y primitivos de `components/ui/` exclusivamente; iconos `lucide-react`; consultar `/admin/design-system`.
- Mobile: todas las vistas deben quedar perfectas en móvil; el mini-mapa pasa a full-width al apilarse el panel de contexto.
- Sin commits/push sin aprobación explícita; documentación en español.

## Trabajo de datos (trazado)
- Trazar los polígonos de las 8 zonas (`PARK_ZONES`) y las posiciones de cámaras sobre la imagen exportada, comparando contra el PDF. Las cámaras de demo/mock (`lib/mock-data.ts`) deben quedar mapeadas para que la funcionalidad sea visible en desarrollo.
- Si alguna zona del sistema no existe en el plano (o viceversa), documentar el gap y dejar la zona sin polígono (no inventar límites).

## Orden de implementación
1. Exportar asset del PDF y validar legibilidad.
2. `lib/park-map.ts` con zonas/cámaras trazadas.
3. `ParkMap` (variantes mini/full/locator) + estados de urgencia.
4. `ParkMapDialog`.
5. Integración resumen (context panel + filtro por clic).
6. Integración detalle de alerta.
7. Integración popups.
8. Ajustes responsive + QA.

## Verificación
- `pnpm dev` + backend mock: en `/operacion`, generar/usar alertas demo y verificar: zona encendida según criticidad, pulso en cámara con alerta, clic en zona filtra la lista, expandir abre el dialog, contador por zona correcto.
- Detalle de alerta: locator enfocado en la zona correcta, cámara origen destacada; alerta sin zona → sin tarjeta.
- Popup prioritario: localizador visible al disparar alerta demo crítica.
- Móvil (viewport ~380px): mapa usable, dialog full-screen, sin scroll horizontal.
- Modo claro/oscuro: overlay legible en ambos (la imagen base permanece clara — aceptado en diseño).
- `pnpm lint` y `pnpm build` limpios. Checklist de secretos antes de cualquier commit (requiere aprobación explícita).
