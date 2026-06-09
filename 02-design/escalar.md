# ESCALAR.md

## Objetivo

Este archivo ya no describe el workflow deseado. Describe el workflow de escalacion que realmente esta implementado hoy en la UI, sus inconsistencias y la brecha exacta contra la especificacion deseada.

## Estado real del flujo ESCALAR

## Resumen corto

Hoy la escalacion es un flujo demo centrado en UI:
- no depende de `rule.can_escalate`
- no existe paso `LLAMAR`
- no existe `llamada_at`
- el operador selecciona roles manualmente
- los destinatarios salen de una lista hardcodeada
- la mutacion principal es local y la llamada API es best-effort

## Fuente de verdad actual

Archivos que hoy definen el flujo:
- `components/operacion/escalate-sheet.tsx`
- `components/operacion/alert-card.tsx`
- `components/operacion/alert-dialog.tsx`
- `components/operacion/alert-popup.tsx`
- `app/(dashboard)/operacion/page.tsx`
- `app/(dashboard)/operacion/alerta/[id]/page.tsx`
- `lib/types.ts`
- `lib/mock-data.ts`
- `lib/pwa-notifications.ts`

## Flujo realmente implementado hoy

### 1. Disparadores de UI

#### En la tarjeta de alerta

`components/operacion/alert-card.tsx`

Comportamiento real:
- si la alerta esta `pendiente`: botones `Atender` y `Descartar`
- si la alerta esta `en_revision`: botones `Resuelta` y `Escalar`

Conclusion:
- desde la tarjeta, `Escalar` aparece solo en `en_revision`

#### En el dialogo de alerta

`components/operacion/alert-dialog.tsx`

Comportamiento real:
- el boton `Escalar` esta siempre visible dentro del footer del dialogo mostrado
- no revisa `rule.can_escalate`
- no revisa `llamada_at`

#### En el popup prioritario

`components/operacion/alert-popup.tsx`

Comportamiento real:
- el boton `Escalar` tambien esta disponible
- tampoco revisa `rule.can_escalate`

#### En el detalle de alerta

`app/(dashboard)/operacion/alerta/[id]/page.tsx`

Comportamiento real:
- el boton `Escalar` aparece mientras la alerta esta `pendiente`
- esto contradice el comportamiento de la tarjeta, donde escalar ocurre en `en_revision`

Conclusion:
- hoy el entry point de escalacion es inconsistente entre superficies

## Fases reales del sheet

`components/operacion/escalate-sheet.tsx`

Fases implementadas hoy:
- `select`
- `preview`
- `sending`
- `done`

No existe la fase:
- `checklist`

## Seleccion de destinatarios

### Como funciona hoy

El operador selecciona manualmente los roles desde:

```ts
const ESCALATION_ROLES: Role[] = [
  'responsable_seguridad',
  'admin_parque',
  'supervisor',
]
```

Los contactos salen de un mapa hardcodeado:

```ts
const ROLE_CONTACTS: Record<Role, { name: string; phone?: string; email?: string }>
```

Roles con contacto real cargado hoy:
- `responsable_seguridad`
- `admin_parque`
- `supervisor`
- `soporte_tns`

No existe ninguna lectura desde:
- `alert.rule?.escalation_roles`
- `rule.can_escalate`
- backend
- configuracion persistida

## Observaciones y envio

### Observacion

El sheet permite una observacion libre opcional.

### Envio visual

Al enviar:
1. cambia a `sending`
2. anima el estado por destinatario
3. marca `sent`
4. cambia a `done`

### Mutacion real

El envio dispara:

```ts
alertsApi.attend(alert.id, { action: 'escalada', observation })
```

Pero esa llamada es:
- fire-and-forget
- envuelta en `.catch(() => {})`
- no bloquea la UX

Conclusion:
- el estado visible de escalacion depende de UI local, no de una respuesta backend real

## Push notification actual

`lib/pwa-notifications.ts`

Si el navegador tiene permiso:
- construye una notificacion local del browser
- no manda email
- no manda push servidor
- no usa outbox backend

## Tipos y datos reales hoy

### `Alert`

En `lib/types.ts`:
- no existe `llamada_at`

### `Rule`

En `lib/types.ts`:
- no existe `can_escalate`
- no existe `escalation_roles`

### `MOCK_RULES`

En `lib/mock-data.ts`:
- no existe configuracion de escalacion por regla

Conclusion:
- el flujo actual no esta modelado en datos; esta modelado solo en componentes

## Brecha exacta contra el flujo deseado

### Lo que el diseno deseado pide

1. `rule.can_escalate`
2. `rule.escalation_roles`
3. boton `LLAMAR`
4. `llamada_at`
5. `ESCALAR` habilitado solo despues de llamar
6. checklist previo
7. contactos predefinidos por regla

### Lo que existe hoy

1. seleccion manual de roles
2. sin `LLAMAR`
3. sin `llamada_at`
4. sin checklist
5. sin contactos definidos por regla
6. sin gating por regla

## Inconsistencias actuales

1. La tarjeta escala desde `en_revision`.
2. El detalle escala desde `pendiente`.
3. El dialogo y popup no aplican el mismo gating.
4. El cliente API espera `/alerts/:id/attend`, pero los backends reales no implementan ese contrato.

## Estado correcto para documentar hoy

Si alguien pregunta "como funciona ESCALAR ahora mismo", la respuesta exacta es:

1. el operador abre el sheet desde alguna vista de alerta
2. elige manualmente uno o mas roles
3. agrega observacion opcional
4. revisa preview
5. se simula el envio visual
6. la alerta se marca localmente como `escalada`
7. opcionalmente se muestra una notificacion local del navegador

Eso es todo. No hay llamada previa, no hay checklist y no hay backend contractual compatible.

## Prioridad tecnica para implementar el flujo correcto

1. mover la configuracion de escalacion al modelo `Rule`
2. agregar `llamada_at` a `Alert`
3. unificar gating entre tarjeta, dialogo, popup y detalle
4. reemplazar seleccion manual por roles definidos en regla
5. agregar checklist
6. alinear `lib/api.ts` con un backend real

---
Ultima actualizacion basada en codigo: 2026-06-09
