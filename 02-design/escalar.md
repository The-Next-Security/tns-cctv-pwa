# Feature: Nuevo Workflow del Botón ESCALAR

> **Documento de diseño e implementación**
> Preparado para ejecución con `/goal`
>
> **Sentencia de lanzamiento:**
> ```
> /goal Implementa el nuevo workflow del botón ESCALAR según las especificaciones del archivo 02-design/escalar.md. Respeta el design system (tokens ds-*), los datos mock existentes y el stack actual (Next.js + TypeScript + Tailwind v4).
> ```

---

## Contexto y Motivación

El botón ESCALAR actual permite escalar una alerta en cualquier momento desde el estado `en_revision`, sin ningún prerequisito ni control. Además, los contactos de escalación se seleccionan manualmente en el momento por el operador.

El nuevo diseño establece un flujo más controlado y auditable:

1. La **regla** define si las alertas que genera pueden ser escaladas, y a qué roles
2. El operador **primero debe presionar LLAMAR** (abre dialer `tel://`) antes de poder escalar
3. Al presionar ESCALAR, aparece un **checklist de acciones previas** que el operador verifica
4. Los contactos son **fijos y predefinidos** en la regla (no editables al momento de escalar)

---

## Flujo Nuevo (antes vs. después)

**Antes:**
```
Alerta en_revision → [ESCALAR] → Seleccionar roles → Preview → Enviar → Escalada
```

**Después:**
```
Alerta en_revision (si regla.can_escalate = true)
  → [LLAMAR] (abre popover con contactos tel://) → marca llamada_at
  → [ESCALAR] (habilitado solo tras LLAMAR) 
  → Checklist de acciones previas
  → Preview (contactos fijos de la regla)
  → Enviar → Escalada
```

---

## Archivos a Modificar

### 1. `lib/types.ts`

**Agregar a la interfaz `Rule`:**
```typescript
can_escalate?: boolean       // Toggle: esta regla permite escalación
escalation_roles?: Role[]    // Roles a notificar al escalar
```

**Agregar a la interfaz `Alert`:**
```typescript
llamada_at?: string | null   // ISO timestamp cuando se presionó LLAMAR (null = no se ha llamado)
```

El tipo `Role` ya existe en el proyecto (`responsable_seguridad | admin_parque | supervisor | soporte_tns | etc.`).

---

### 2. `lib/mock-data.ts`

Actualizar `MOCK_RULES` en las reglas de criticidad alta/crítica (ids: 1, 2, 4, 7, 8):
```typescript
{
  // ...campos existentes...
  can_escalate: true,
  escalation_roles: ['responsable_seguridad', 'admin_parque'],
}
```

Reglas de criticidad baja/media (ids: 3, 5, 6, 9):
```typescript
{
  can_escalate: false,
  escalation_roles: [],
}
```

---

### 3. `app/(dashboard)/reglas/page.tsx`

Agregar a `RuleFormData`:
```typescript
can_escalate: boolean
escalation_roles: Role[]
```

Actualizar valor inicial del formulario:
```typescript
can_escalate: false,
escalation_roles: [],
```

**Nueva sección UI "Escalación"** en el formulario (agregar después de la sección "Acciones"):

```
[ Switch ] Permitir escalación en alertas de esta regla

  Si activo, mostrar:

  Roles que recibirán la escalación:
    ☐ Responsable de seguridad
    ☐ Administrador del parque
    ☐ Supervisor
    ☐ Soporte TNS

  Nota informativa: "Al escalar una alerta de esta regla, se notificará
  a los roles seleccionados. El operador deberá haber presionado LLAMAR
  antes de poder escalar."
```

Tokens de UI a usar: `bg-ds-surface`, `border-ds-hairline`, `text-ds-ink-body`, switches de `components/ui/` existentes.

---

### 4. `components/operacion/escalate-sheet.tsx`

**Cambio de fases:**

| Antes | Después |
|-------|---------|
| `'select'` → `'preview'` → `'sending'` → `'done'` | `'checklist'` → `'preview'` → `'sending'` → `'done'` |

**Eliminar fase `'select'`** (selección manual de roles): ya no es necesaria porque los roles vienen de la regla.

**Agregar fase `'checklist'` (primera fase):**
- Título: "Antes de escalar — ¿qué acciones realizaste?"
- Lista fija global (hardcoded por ahora, arquitectura preparada para ser configurable por regla en el futuro):
  ```
  ☐ Llamé a Carabineros (133)
  ☐ Notifiqué al guardia de turno
  ☐ Intenté contactar al responsable de seguridad
  ☐ Revisé cámaras adicionales del sector
  ☐ Activé el protocolo de emergencia local
  ```
- No hay validación obligatoria (ningún check es requerido), pero el botón "Continuar" indica cuántas acciones se marcaron
- Las acciones marcadas se concatenan en el campo `observation` del payload de la API (para trazabilidad)
- Botón "Continuar con escalación" → avanza a fase `'preview'`

**Actualizar fase `'preview'`:**
- Los contactos ya no vienen de la selección del operador sino de `alert.rule?.escalation_roles`
- Resolver roles a nombres/teléfonos usando `ROLE_CONTACTS` (ya existe en el archivo)
- Texto de contexto: `"Contactos definidos en la regla · {alert.rule?.name}"`
- Los contactos no son editables

**Props del componente:** Agregar `preSelectedRoles?: Role[]` (o leerlos directamente de `alert.rule?.escalation_roles`)

---

### 5. Botón LLAMAR — Agregar en 3 componentes

#### Condiciones para renderizar el botón LLAMAR:
```typescript
const showLlamar = alert.status === 'en_revision' && alert.rule?.can_escalate === true
```

#### Comportamiento:
1. Click → abre un `Popover` (shadcn `components/ui/`) con la lista de contactos de `alert.rule.escalation_roles`
2. Cada contacto muestra: nombre, rol y un botón de ícono `Phone` que es un `<a href="tel://número">`
3. El acto de abrir el Popover ejecuta `onLlamar(alert.id)` → marca `llamada_at`
4. Después de marcar, el botón LLAMAR muestra ícono `Phone` con check (verde, `text-ds-accent` o similar) indicando "llamada realizada"

#### Archivos:

**`components/operacion/alert-card.tsx`**
- Agregar botón LLAMAR (Phone icon, lucide-react) antes del botón ESCALAR
- Recibe prop `onLlamar: (id: number) => void`

**`components/operacion/alert-dialog.tsx`**
- Agregar botón LLAMAR antes del botón ESCALAR
- Recibe prop `onLlamar: (id: number) => void`

**`app/(dashboard)/operacion/alerta/[id]/page.tsx`**
- Agregar botón LLAMAR con estado local: `const [llamadaAt, setLlamadaAt] = useState<string | null>(null)`
- Al abrir el popover: `setLlamadaAt(new Date().toISOString())`

---

### 6. Condiciones nuevas del botón ESCALAR

En los mismos 3 archivos anteriores, agregar condición de habilitación:

```typescript
// Visible solo si la regla permite escalar:
const showEscalar = alert.rule?.can_escalate === true && alert.status === 'en_revision'

// Habilitado solo si ya se llamó:
const escalarDisabled = !alert.llamada_at  // o !llamadaAt en el estado local

// Tooltip cuando deshabilitado:
title="Primero debes presionar LLAMAR"
```

---

### 7. `app/(dashboard)/operacion/page.tsx`

Agregar handler para LLAMAR:
```typescript
const handleLlamar = (alertId: number) => {
  setAlerts(prev => prev.map(a =>
    a.id === alertId
      ? { ...a, llamada_at: new Date().toISOString() }
      : a
  ))
}
```

Pasar `onLlamar={handleLlamar}` a `AlertCard`, `AlertDialog` y `EscalateSheet`.

---

## Contexto de Código Existente Relevante

| Archivo | Líneas clave | Uso |
|---------|-------------|-----|
| `lib/types.ts` | L.135-168 (Alert), L.171-198 (Rule) | Agregar campos nuevos |
| `lib/mock-data.ts` | L.134-277 (MOCK_RULES) | Actualizar con `can_escalate` y `escalation_roles` |
| `components/operacion/escalate-sheet.tsx` | L.41-52 (ROLE_CONTACTS), tipo `Phase` | Base para el refactor de fases |
| `app/(dashboard)/reglas/page.tsx` | L.77-90 (RuleFormData), L.640-676 (Acciones) | Donde agregar sección de Escalación |
| `app/(dashboard)/operacion/page.tsx` | L.186-188 (handleAction escalate), L.255 (onEscalate) | Donde agregar handleLlamar |
| `components/operacion/alert-card.tsx` | L.284-293 (botón ESCALAR) | Agregar LLAMAR aquí |
| `components/operacion/alert-dialog.tsx` | L.201-209 (botón ESCALAR) | Agregar LLAMAR aquí |
| `app/(dashboard)/operacion/alerta/[id]/page.tsx` | L.360-368 (botón ESCALAR) | Agregar LLAMAR aquí |

**Roles existentes con contactos** (en `escalate-sheet.tsx`):
```typescript
const ROLE_CONTACTS = {
  responsable_seguridad: { name: 'Carlos Rodríguez', phone: '+56 9 8821 4430', email: 'c.rodriguez@agrolivo.cl' },
  admin_parque:          { name: 'Ana Méndez',        phone: '+56 9 7743 2219', email: 'admin@agrolivo.cl' },
  supervisor:            { name: 'Pedro Soto',        phone: '+56 9 9103 5567', email: 'p.soto@agrolivo.cl' },
  soporte_tns:           { name: 'TNS Soporte',       phone: '+56 2 2891 0045', email: 'soporte@thenextsecurity.cl' },
}
```
Este objeto debe moverse a `lib/constants.ts` o a un archivo compartido para que tanto `escalate-sheet.tsx` como el nuevo popover de LLAMAR puedan usarlo.

---

## Design System — Recordatorio

- Fondo de cards/panels: `bg-ds-surface`
- Bordes: `border-ds-hairline`
- Texto principal: `text-ds-ink-display`
- Texto secundario: `text-ds-ink-body`
- Texto muted: `text-ds-ink-muted`
- Acento/success: `text-ds-accent`
- Error/alerta: `text-ds-signal`
- Solo iconos de `lucide-react` (Phone, PhoneCall, CheckCircle, ArrowUpRight)
- Componentes UI de `components/ui/` (Popover, Switch, Checkbox, Button)

---

## Verificación

1. `/reglas` → editar una regla → verificar sección "Escalación" con toggle y checkboxes de roles
2. Activar escalación en regla 1 (Intrusion perimetral nocturna)
3. En `/operacion`, abrir una alerta de esa regla en estado `en_revision`
4. Verificar que ESCALAR está **deshabilitado** con tooltip "Primero debes presionar LLAMAR"
5. Presionar LLAMAR → popover con contactos y `tel://` → ESCALAR se **habilita**
6. LLAMAR muestra check verde tras ser presionado
7. Presionar ESCALAR → EscalateSheet abre con **checklist** primero (no selección de roles)
8. Completar checklist → preview con contactos **fijos** de la regla (no editables)
9. Para una regla con `can_escalate: false`, verificar que LLAMAR y ESCALAR **no aparecen**
10. Confirmar que el tipo `Alert` con `llamada_at` no rompe TypeScript en todo el proyecto

---

## Notas para el Desarrollador

- Los datos mock son suficientes para implementar y probar todo el flujo
- El campo `llamada_at` en Alert no requiere endpoint de API por ahora — se maneja en estado local (mock)
- La lista de acciones del checklist está hardcoded por diseño inicial; dejar un comentario `// TODO: configurable por regla en v2` cerca de la constante
- El `ROLE_CONTACTS` debe extraerse a un lugar compartido antes de usarlo en dos componentes distintos
