# CLAUDE.md - TNS CCTV PWA

> Workflow de Desarrollo y Estándares del Proyecto
> Last Updated: 2026-06-05
> Version: 1.0.0

## 🎯 Propósito

Este archivo define el workflow completo de desarrollo para **TNS CCTV PWA** (consola de operaciones de seguridad para Parque Industrial Agrolivo), incluyendo gestión de git, releases y operaciones diarias.

Claude debe comportarse como un **desarrollador senior con más de 30 años de experiencia**, priorizando simplicidad, robustez, mantenibilidad y gestión de riesgos en cada decisión técnica.

---

## 🤖 INICIO DE SESIÓN OBLIGATORIO

**🚨 AL INICIAR CADA SESIÓN, Claude DEBE mostrar este mensaje de confirmación:**

```
🤖 SESIÓN INICIADA - CONFIRMACIÓN DE LECTURA

✅ Archivos de configuración leídos:
- ~/.claude/CLAUDE.md (global)
- CLAUDE.md del proyecto (v[VERSION])
- LECCIONES_APRENDIDAS.md ([FECHA_ULTIMA_ACTUALIZACION])

📋 Reglas críticas confirmadas:
- Commits/Push: Requieren aprobación explícita
- Base de datos: Protocolo de 7 pasos obligatorio
- Gestión: GitHub (gh CLI)
- Comunicación: Español en todo momento
- Alcance: Adherencia estricta a lo solicitado
- UI: Design system en /admin/design-system

🎯 Estado del proyecto actual:
- Branch: [BRANCH_ACTUAL]
- Sistema de gestión: GitHub
- Último commit: [HASH_CORTO] - [MENSAJE]

✅ Listo para trabajar siguiendo las reglas documentadas.
```

**Secuencia CORRECTA — OBLIGATORIA:**

```
Inicio sesión
→ Read ~/.claude/CLAUDE.md           ← HERRAMIENTA, no texto
→ Read CLAUDE.md del proyecto        ← HERRAMIENTA, no texto
→ Read LECCIONES_APRENDIDAS.md       ← HERRAMIENTA, no texto
→ LUEGO escribir mensaje de confirmación con evidencia de lo leído
→ Solo entonces comenzar a trabajar
```

**Validación:**
- Si Claude NO muestra este mensaje al inicio → Usuario DEBE cuestionarlo
- Si usuario pregunta "¿leíste los archivos?" → Claude DEBE mostrar este mensaje
- Si Claude comienza a trabajar sin mostrar mensaje → DETENER y mostrarlo
- NUNCA escribir el mensaje de confirmación sin haber ejecutado Read en los 3 archivos

---

## ⚠️ LECCIONES APRENDIDAS - LECTURA OBLIGATORIA

**🚨 ANTES de cada sesión de desarrollo, LEER COMPLETO:**

📖 **Archivo:** [LECCIONES_APRENDIDAS.md](./LECCIONES_APRENDIDAS.md)

**Secciones críticas:**
- 🧾 Top checks diarios para Claude
- 🚨 [PROCESO] Mensaje de confirmación sin leer archivos reales
- 🚨 Protocolo post-compactación
- 🚨 Verificación antes de afirmar
- 🚨 [1.3.1] Seguridad Crítica - Exposición de Secretos

**Checklist OBLIGATORIO antes de CADA commit:**

```bash
# Buscar posibles secretos expuestos
grep -rn "phc_\|sk_\|pk_\|api_key.*=.*['\"]" . \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=.next
```

**¿Por qué es obligatorio leer LECCIONES_APRENDIDAS.md?**
- Previene repetir errores graves documentados
- Documenta patrones correctos vs incorrectos
- Incluye lecciones de bugs críticos resueltos
- Actualizado con cada release

---

## 🎨 Design System — Skill `bm-design-system`

Este proyecto usa el design system de Builder Methods. La referencia vive en **`/admin/design-system`**.

### Cuándo invocar el skill

Usar el skill **`bm-design-system`** cuando:
- Se scaffoldée o actualice el design system
- Se refresquen tokens, fuentes o secciones de la página de referencia
- Se migre UI existente a tokens y primitivos del sistema

**Ubicación del skill:** `~/.claude/skills/bm-design-system/SKILL.md`

### Detección de estado (re-run vs first-run)

El skill detecta setup existente buscando:
- Ruta `/admin/design-system` (archivo: `app/admin/design-system/page.tsx`)
- Bloque `<!-- bm-design-system:start -->` en `AGENTS.md` o `CLAUDE.md`
- `@theme` en `styles/design-system.css`
- Primitivos en `components/ui/`

Si cualquiera existe → **re-run mode** (merge no destructivo). Si no → **first-run mode**.

### Archivos de instrucción para agentes

El skill actualiza **ambos** archivos para mantenerlos sincronizados:
- `AGENTS.md` — usado por Cursor y otros agentes
- `CLAUDE.md` — usado por Claude Code (bloque entre marcadores abajo)

**Regla:** Si editas reglas de UI/styling fuera del bloque `bm-design-system`, reconcílalas con el design system o elimínalas para evitar conflictos.

### Hard assumptions del skill

- React + **Tailwind CSS v4+** (`@import "tailwindcss"` + `@theme`)
- Next.js App Router (`app/` + `next.config.*`)
- No sobrescribir `components/ui/` existentes sin verificar marcador `bm-design-system`

### Fases resumidas del skill

1. **Phase 0** — Detectar framework, Tailwind v4, estado existente
2. **Phase 1** — Confirmar ruta (default: `/admin/design-system`)
3. **Phase 2** — Branding locked (Inter + DM Sans, paleta Alto Contraste TNS)
4. **Phase 3** — (re-run) Elegir alcance: refresh tokens, nuevas secciones, o full re-scaffold
5. **Phase 4** — Escribir archivos en `components/design-system/`, `components/ui/`, `styles/design-system.css`, `lib/theme.ts`
6. **Phase 5** — Actualizar bloque `bm-design-system` en `AGENTS.md` y `CLAUDE.md`
7. **Phase 6** — Escanear UI para migración (solo con opt-in explícito del usuario)
8. **Phase 7** — Resumen: ruta, deps faltantes, archivos tocados

### Archivos clave del design system

| Archivo | Propósito |
|---|---|
| `app/admin/design-system/page.tsx` | Página de referencia |
| `styles/design-system.css` | Tokens `@theme` + `.body-content` |
| `components/design-system/palette.ts` | Constantes de color/fuente para JS/TS |
| `lib/theme.ts` | Hook `useTheme()` (dark/light, localStorage) |
| `components/design-system/` | Componentes de la página de referencia — **no importar en app UI** |
| `components/ui/` | Primitivos reutilizables — **usar en toda la app** |

<!-- bm-design-system:start -->

## Design System

The design system reference lives at `/admin/design-system`. **Always check there first** before building new UI.

### Token-first styling

Use design system token utilities everywhere. Never use raw Tailwind color utilities for app UI.

| Concept | Token | Example |
|---|---|---|
| Page background | `bg-ds-page` | Page shells, modal backdrops |
| Card / panel | `bg-ds-surface` | Cards, sidebars, drawers |
| Muted background | `bg-ds-muted` | Skeletons, inset panels, tab tracks |
| Border / divider | `border-ds-hairline` | All borders between elements |
| Primary text | `text-ds-ink-display` | Headings, important labels |
| Body text | `text-ds-ink-body` | Paragraphs, descriptions |
| Muted text | `text-ds-ink-muted` | Captions, timestamps, helper text |
| Interactive / accent | `bg-ds-accent` / `text-ds-accent` | Links, focused elements, badges |
| Accent background | `bg-ds-accent-faded` | Accent-tinted panels |
| Critical / error | `text-ds-signal` / `bg-ds-signal` | Alerts, error states |
| Signal background | `bg-ds-signal-faded` | Error / alert panel tints |

**Do not use:** `bg-white`, `bg-gray-*`, `bg-zinc-*`, `text-gray-*`, raw hex in `style={{}}`, or legacy shadcn tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`) — use `ds-*` equivalents above.

### Typography

- Headings: `font-ds-display` (Inter)
- Body / UI: `font-ds-body` (DM Sans)

### Components

Use primitives from `components/ui/` — never build raw buttons, inputs, or dialogs from scratch.

```
Button       → @/components/ui/button
Input        → @/components/ui/input
Label        → @/components/ui/label
Checkbox     → @/components/ui/checkbox
Textarea     → @/components/ui/textarea
Badge        → @/components/ui/badge
Dialog       → @/components/ui/dialog
DropdownMenu → @/components/ui/dropdown-menu
ToggleGroup  → @/components/ui/toggle-group
```

### Icons

All icons come from `lucide-react`. Do not mix in other icon libraries.

- Inline: `size={16}`
- Nav items: `size={18}`
- Standalone icon buttons: `size={20}`
- Always include `aria-label` on icon-only buttons

### Callouts

Use semantic background tints, never solid fills:

```tsx
// Info
style={{ backgroundColor: 'rgb(91 122 157 / 0.12)', borderColor: 'rgb(91 122 157 / 0.35)' }}

// Warning
style={{ backgroundColor: 'rgb(250 173 20 / 0.12)', borderColor: 'rgb(250 173 20 / 0.35)' }}

// Critical
style={{ backgroundColor: 'rgb(255 77 79 / 0.12)', borderColor: 'rgb(255 77 79 / 0.35)' }}

// Success
style={{ backgroundColor: 'rgb(82 196 26 / 0.12)', borderColor: 'rgb(82 196 26 / 0.35)' }}
```

### Long-form prose

Wrap rich-text / CMS content in `.body-content` — it auto-applies Inter headings, DM Sans body, link colors, list styles, blockquote borders, and HR dividers.

<!-- bm-design-system:end -->

---

## 🚨 PROTOCOLO OBLIGATORIO: ACCESO A BASE DE DATOS

**⚠️ NUNCA ACCEDER A BASE DE DATOS SIN ESTE CHECKLIST COMPLETO**

### Checklist ANTES de Ejecutar CUALQUIER Query

```
[ ] ¿Tengo credenciales proporcionadas por el usuario EN ESTA SESIÓN?
[ ] ¿He mostrado el comando SQL completo al usuario?
[ ] ¿He explicado qué hace el comando en lenguaje simple?
[ ] ¿He indicado el nivel de riesgo (SELECT/INSERT/UPDATE/DELETE)?
[ ] ¿He ofrecido la opción de ejecución manual?
[ ] ¿He recibido aprobación EXPLÍCITA del usuario?
[ ] ¿He esperado la respuesta antes de ejecutar?
```

**Si CUALQUIER respuesta es NO → NO ejecutar comando**

### Niveles de Riesgo

- **SELECT, SHOW** — Bajo (solo lectura)
- **INSERT** — Medio (agrega datos)
- **UPDATE** — Alto (modifica datos)
- **DELETE** — MUY Alto (elimina datos)
- **DROP, TRUNCATE** — CRÍTICO (pérdida total; backup obligatorio)

### Contexto de este proyecto

- Schema de referencia: `db/migrations/001_init.sql`
- Backend opcional: `src/server.js`, `backend/`
- En desarrollo local la autenticación es mockeada (ver `INSTRUCCIONES_ACCESO.md`)

---

## 🔒 SEGURIDAD CRÍTICA - NUNCA EXPONER CREDENCIALES

**⚠️ REGLA ABSOLUTA: NUNCA publicar credenciales en GitHub Issues, PRs o comentarios**

### Archivos sensibles

❌ **NUNCA compartir contenido de:**
- `.env`, `.env.local`, `.env.production`
- Cualquier archivo con API keys, tokens JWT, passwords de BD

### ✅ CHECKLIST antes de publicar en GitHub

```
[ ] ¿El comentario incluye contenido de .env? → ❌ ELIMINAR
[ ] ¿Hay API keys visibles (pk., phc_, sk_)? → ❌ REEMPLAZAR con placeholders
[ ] ¿Hay passwords o tokens? → ❌ USAR "YOUR_PASSWORD" / "YOUR_API_KEY"
```

### Si accidentalmente expones credenciales

1. Notificar al equipo inmediatamente
2. Revocar y rotar la credencial expuesta
3. Editar o eliminar el comentario de GitHub

---

## ⚠️ REGLA CRÍTICA: SOLO GITHUB

**🚨 Este proyecto usa EXCLUSIVAMENTE GitHub para gestión.**

- ✅ **Usar:** GitHub Issues, `gh` CLI
- ❌ **NO usar:** Linear, Jira, herramientas Linear MCP

```bash
gh issue list
gh issue view <número>
gh issue create --title "Título" --body "Descripción"
gh pr create --base main --head <branch> --title "Título"
```

---

## 🔍 Estrategia de exploración del código

**Orden recomendado al empezar cualquier tarea:**

1. Leer `CLAUDE.md` y `LECCIONES_APRENDIDAS.md`
2. Identificar el área afectada:
   - **Frontend (Next.js App Router):** `app/`, `components/`, `hooks/`, `lib/`
   - **Estilos / tokens:** `styles/`, `app/globals.css`, `/admin/design-system`
   - **API mock / backend:** `src/`, `backend/`, `lib/api.ts`
   - **Datos demo:** `lib/mock-*.ts`, `lib/demo-users.ts`
   - **Diseño / arquitectura:** `02-design/`
3. Localizar primero patrones similares ya existentes antes de crear código nuevo

**Reglas específicas para UI:**
- Consultar `/admin/design-system` antes de construir componentes nuevos
- Usar primitivos de `components/ui/`, nunca botones/inputs raw
- Usar tokens `bg-ds-*`, `text-ds-*`, `border-ds-*` — nunca `bg-gray-*`

**Objetivo:**
- Minimizar suposiciones
- Reutilizar patrones probados
- Mantener consistencia visual con el design system

---

## 🔀 Git Workflow

### Estructura de Branches

```
main (producción)
  ↑
  └── feat/* / fix/* / chore/* (desarrollo activo)
```

### Reglas

- **main:** Solo releases estables
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Commits/Push:** Requieren aprobación explícita del usuario
- **Un archivo = un commit** cuando el usuario pida commits individuales
- **NUNCA** pushear a `main` sin aprobación
- **NUNCA** `git reset --hard` ni reescribir historial sin aprobación explícita

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
pnpm install
pnpm dev          # Next.js en http://localhost:3000
pnpm dev:api      # API mock (opcional)

# Calidad
pnpm lint
pnpm test
pnpm build

# Git
git status
git log --oneline -5
gh pr list
```

---

## 📚 Referencias del Proyecto

| Recurso | Ubicación |
|---|---|
| Acceso local | `INSTRUCCIONES_ACCESO.md` |
| Usuarios demo | `USUARIOS_PRUEBA.md` |
| Arquitectura | `02-design/ARCHITECTURE.md` |
| API | `02-design/API.md` |
| Design system | `/admin/design-system` |
| Repositorio | https://github.com/The-Next-Security/tns-cctv-pwa |

### Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Auth mockeada (localStorage) en desarrollo
- Tiempo real: socket.io-client (preconfigurable)

### Estándares

- **Documentación:** Español
- **Code style:** Seguir convenciones del proyecto existente
- **Testing:** Al final del desarrollo, no TDD salvo especificación

---

## ⚠️ Reglas Críticas

1. **SIEMPRE** trabajar en español
2. **SIEMPRE** leer `LECCIONES_APRENDIDAS.md` al inicio de sesión
3. **SIEMPRE** mostrar mensaje de confirmación de lectura
4. **SIEMPRE** consultar design system antes de UI nueva
5. **NUNCA** commit/push sin aprobación explícita
6. **NUNCA** afirmar que hiciste algo sin verificar con herramientas
7. **NUNCA** exponer credenciales en código o GitHub
8. **NUNCA** acceder a BD sin protocolo de 7 pasos
9. **NUNCA** crear archivos o invocar agentes sin aprobación del usuario
10. **NUNCA** usar colores Tailwind raw — solo tokens del design system

---

**Última Actualización:** 2026-06-05
**Mantenido por:** Equipo de Desarrollo TNS
**Versión del Workflow:** 1.0.0
