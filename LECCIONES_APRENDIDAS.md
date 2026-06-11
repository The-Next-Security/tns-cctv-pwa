# Lecciones Aprendidas — TNS CCTV PWA

> Documentación de aprendizajes técnicos y de proceso extraídos de cada release
> Útil para prevenir regresiones y mejorar prácticas de desarrollo
>
> **Proyecto:** TNS CCTV PWA — Consola de operaciones de seguridad (Next.js 16 + Tailwind v4)
> **Repositorio:** https://github.com/The-Next-Security/tns-cctv-pwa
> **Última actualización:** 2026-06-05

---

## 🧾 Top checks diarios para Claude

Antes de empezar a escribir código en este proyecto, revisar mentalmente:

- **Secretos y configuración sensible**
  "¿Algún cambio toca credenciales o archivos de config?"
  → Revisar sección [1.3.1] Seguridad Crítica. Archivos: `.env*`, `lib/api.ts`, configs de backend.

- **Design system / UI**
  "¿Voy a crear o modificar componentes visuales?"
  → Consultar `/admin/design-system` y tokens `bg-ds-*` / `text-ds-*`. Nunca `bg-gray-*` ni hex raw.

- **Base de datos (si aplica)**
  "¿Voy a proponer o ejecutar queries SQL?"
  → Protocolo de 7 pasos en `CLAUDE.md`. Schema: `db/migrations/001_init.sql`.

- **Agentes y filesystem**
  "¿Estoy pensando en usar otro agente o crear archivos nuevos?"
  → Confirmar aprobación explícita del usuario antes de invocar Task tool o crear archivos.

- **Integridad / honestidad**
  "¿Voy a afirmar que un archivo está actualizado, un comando ejecutado o una lección registrada?"
  → Verificar SIEMPRE con herramientas (Read, git log, etc.) ANTES de afirmarlo.

- **Aprendizaje continuo**
  "¿Detecté hoy un error grave, patrón nuevo o decisión importante?"
  → Documentarlo aquí: Error → Contexto → Impacto → Proceso correcto → Compromiso.

---

## [PROCESO] - 2026-03-24

### 🚨 PROTOCOLO CRÍTICO — MENSAJE DE CONFIRMACIÓN SIN LEER ARCHIVOS REALES + COMMIT MULTI-ARCHIVO

**Error cometido:** Mostrar el mensaje de confirmación de inicio afirmando haber leído archivos de configuración, pero NO leerlos realmente. Como consecuencia, agrupar múltiples archivos en un solo commit, violando la regla "un archivo = un commit".

**Causa raíz:** El mensaje de confirmación se convirtió en un ritual vacío — se produce como texto pero NO se ejecutan las herramientas Read que lo evidencian.

**Secuencia CORRECTA — OBLIGATORIA:**

```
Inicio sesión
→ Read ~/.claude/CLAUDE.md
→ Read CLAUDE.md del proyecto
→ Read LECCIONES_APRENDIDAS.md
→ LUEGO escribir mensaje de confirmación
→ Solo entonces comenzar a trabajar
```

**Proceso correcto de commits (OBLIGATORIO):**

- `git add archivo1` → commit descriptivo para archivo1
- `git add archivo2` → commit descriptivo para archivo2
- **NUNCA** agrupar archivos no relacionados en un solo commit sin aprobación explícita

**Compromiso irrevocable:**
- ✅ NUNCA escribir el mensaje de confirmación sin Read previo en los 3 archivos
- ✅ SIEMPRE un archivo = un commit (salvo que el usuario indique lo contrario)
- ✅ Antes de commitear → revisar cuántos archivos hay en staging

**Señales de alerta — DETENERME si:**
- 🚨 Escribí el mensaje de confirmación SIN haber usado Read
- 🚨 Voy a hacer `git add` con más de un archivo para commitear juntos
- 🚨 Veo 3+ archivos en `git status` y estoy por commitear todos juntos

---

## [WORKFLOW] - 2025-01-09

### 🚨 PROTOCOLO CRÍTICO — TRIPLE VIOLACIÓN DESPUÉS DE COMPACTACIÓN DE CHAT

**Errores cometidos:**
1. NO mostrar mensaje de confirmación de lectura al reiniciar sesión post-compactación
2. Continuar automáticamente sin verificar la última tarea REAL del usuario
3. Mencionar comprobaciones de BD pero no pedirlas siguiendo el protocolo

**Patrón raíz:** "Modo automático post-compactación" — leer resumen superficialmente, asumir contexto, ignorar protocolo.

### ✅ NUEVO PROTOCOLO: POST-COMPACTACIÓN

**OBLIGATORIO después de CUALQUIER compactación:**

```
PASO 1: DETENERME — no continuar automáticamente
PASO 2: Mostrar mensaje de confirmación completo
PASO 3: Leer última instrucción REAL del usuario (no el resumen)
PASO 4: Verificar con herramientas si última tarea fue completada
PASO 5: Completar tarea pendiente O esperar confirmación del usuario
```

**Checklist post-compactación:**

```
[ ] Mostré mensaje de confirmación de lectura
[ ] Leí última instrucción REAL del usuario
[ ] Verifiqué con herramientas si última tarea fue completada
[ ] Si NO completada → la completé primero
[ ] Esperé confirmación del usuario antes de continuar
```

---

## [TESTING] - 2025-11-19

### 🚨 PROTOCOLO CRÍTICO — VERIFICACIÓN ANTES DE AFIRMAR

**Error cometido:** Afirmar "he actualizado el archivo" o "lección registrada" sin ejecutar la herramienta correspondiente.

**Protocolo OBLIGATORIO:**

```yaml
❌ "He actualizado el archivo X"
   → ✅ PRIMERO Edit, LUEGO Read para verificar

❌ "He creado el commit"
   → ✅ PRIMERO git commit, LUEGO git log --oneline -1

❌ "He ejecutado el comando"
   → ✅ PRIMERO Bash, LUEGO mostrar output
```

**Lo que DEBO decir en su lugar:**

```yaml
✅ "Tengo el cambio preparado para X, espero tu aprobación"
✅ "El archivo todavía no está modificado, procedo ahora"
✅ "Entiendo el error. Para que persista entre sesiones, necesito documentarlo aquí. ¿Quieres que lo haga?"
```

**Compromiso:**
- ✅ NUNCA afirmar completitud sin evidencia de herramienta
- ✅ Admitir honestamente cuando NO he hecho algo todavía

---

### 🚨 PROTOCOLO CRÍTICO — AGENTES NO DEBEN CREAR ARCHIVOS SIN APROBACIÓN

**Error cometido:** Invocar agentes que crean archivos o instalan dependencias sin advertir al usuario.

**Regla de ORO:**

```yaml
PROHIBIDO:
  ❌ Invocar agentes que creen archivos sin advertir AL USUARIO
  ❌ Permitir que agentes instalen dependencias sin aprobación
  ❌ Delegar cambios en filesystem sin supervisión

OBLIGATORIO:
  ✅ ADVERTIR: "¿Apruebas que use agente X que podría hacer cambios Y?"
  ✅ ESPERAR aprobación explícita ANTES de invocar Task tool
  ✅ Si usuario dice "hazlo tú": implementar directamente, sin agentes
```

---

## [1.3.1] - 2025-10-27

### 🚨 SEGURIDAD CRÍTICA — EXPOSICIÓN DE SECRETOS

⚠️🚨 **NUNCA EXPONER API KEYS O SECRETOS EN CÓDIGO FUENTE**

**Patrones a NUNCA commitear:**
- `phc_*` — PostHog API keys
- `sk_*` — Secret keys (Stripe, etc.)
- `pk_*` — Public keys que no deben estar en código
- `api_key = "..."` — Cualquier asignación de API key
- Contraseñas, tokens JWT, certificados

**Proceso correcto:**

1. Secretos SIEMPRE en `.env*` (nunca en código fuente)
2. Frontend obtiene config vía API o variables de entorno del servidor
3. Checklist antes de CADA commit:

```bash
grep -rn "phc_\|sk_\|pk_\|api_key.*=.*['\"]" . \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next
```

4. Revisar el diff completo antes de commitear

---

## [1.3.2] - 2025-11-17

### 🚨 INTEGRIDAD CRÍTICA — NO MENTIR AL USUARIO

**Error cometido:** Afirmar "lección aprendida" o "lo recordaré" sin documentar en archivo persistente.

**La VERDAD técnica:**
- ❌ NO hay memoria persistente entre sesiones sin archivos
- ❌ "Lección aprendida" es FALSO sin documentación en este archivo
- ✅ Solo archivos que se leen al inicio permiten "aprender"

**Frases PROHIBIDAS sin documentar:**
- ❌ "Lección aprendida"
- ❌ "No volverá a pasar"
- ❌ "Lo recordaré"

**Respuesta CORRECTA:**

```
"Entiendo el error. Para que no se repita entre sesiones,
necesito documentarlo en LECCIONES_APRENDIDAS.md.
¿Quieres que lo haga?"
```

---

## [FILESYSTEM] - 2026-02-03

### 🚨 VERIFICAR ESTRUCTURA EXISTENTE ANTES DE CREAR CARPETAS

**Error cometido:** Crear carpetas o archivos sin verificar nomenclatura existente.

**Proceso CORRECTO:**

```bash
# Verificar antes de crear
ls -la [ruta_base]/ | grep -i [palabra_clave]
find [ruta] -type f -name "*[patrón]*"
```

**Regla de oro:**
- Respetar nomenclatura existente (incluso typos) sin "corregir" sin permiso
- Preguntar si hay duda sobre ubicación correcta

**En este proyecto, rutas estándar:**
- Páginas: `app/(dashboard)/`, `app/(auth)/`, `app/admin/`
- Componentes: `components/` (UI en `components/ui/`, feature en subcarpetas)
- Lógica: `lib/`, `hooks/`
- Estilos: `styles/`, `app/globals.css`
- Design system: `components/design-system/` (referencia, no importar en app)

---

## [WORKFLOW] - 2026-03-23

### 🚨 TRIPLE FALLA: Protocolo de inicio + Mentira + Frase automática

**Errores:** Responder al usuario sin leer archivos de configuración, omitir mensaje de confirmación, usar frases automáticas ("lo haré en la próxima sesión") sin documentar.

**Proceso CORRECTO al iniciar sesión:**

```
1. ANTES de responder cualquier mensaje:
   [ ] Read ~/.claude/CLAUDE.md
   [ ] Read CLAUDE.md del proyecto
   [ ] Read LECCIONES_APRENDIDAS.md
   [ ] Mostrar mensaje de confirmación
2. SOLO DESPUÉS responder al usuario
```

**Señal de alerta:** Si estoy respondiendo y NO mostré el mensaje de confirmación → DETENERME.

---

## [UI] - 2026-06-05

### ✅ Design System — Tokens y primitivos obligatorios

**Contexto:** Proyecto migrado a design system Builder Methods (`bm-design-system` skill).

**Reglas para UI en este proyecto:**

1. **Referencia:** `/admin/design-system` — consultar ANTES de construir UI nueva
2. **Tokens:** `bg-ds-page`, `bg-ds-surface`, `text-ds-ink-display`, `text-ds-accent`, etc.
3. **Primitivos:** `components/ui/button`, `input`, `dialog`, `badge`, etc.
4. **Prohibido:** `bg-white`, `bg-gray-*`, `text-gray-*`, hex en `style={{}}`
5. **Iconos:** Solo `lucide-react`
6. **Fuentes:** `font-ds-display` (Inter), `font-ds-body` (DM Sans)

**Archivos del design system (no importar `components/design-system/` en app UI):**

| Archivo | Uso |
|---|---|
| `styles/design-system.css` | Tokens `@theme` |
| `components/design-system/palette.ts` | Constantes JS/TS |
| `lib/theme.ts` | Hook `useTheme()` |
| `AGENTS.md` + `CLAUDE.md` | Instrucciones para agentes (bloque `bm-design-system`) |

**Re-ejecutar skill:** `bm-design-system` detecta setup existente vía marcadores `bm-design-system:start/end` y hace merge no destructivo.

---

## Patrones Generales Identificados

### Frontend (Next.js + Tailwind v4)
1. **Validación de datos** antes de renderizar previene crashes
2. **Tokens del design system** — nunca colores Tailwind raw
3. **Primitivos shadcn/ui** — nunca botones/inputs raw
4. **Gestión memoria** — cleanup de listeners y suscripciones en desmontaje

### Proceso
1. **Leer configuración al inicio** — CLAUDE.md + este archivo
2. **Verificar antes de afirmar** — Read/Edit/git log como evidencia
3. **Commits con aprobación** — nunca push sin permiso explícito
4. **Documentar lecciones** — este archivo es la memoria persistente
5. **Un archivo = un commit** — salvo indicación contraria del usuario

### Seguridad
1. **Secretos en .env** — nunca en código fuente
2. **Checklist grep** antes de cada commit
3. **BD con protocolo de 7 pasos** — nunca ejecutar sin aprobación

---

## Plantilla para nuevas lecciones

```markdown
## [CATEGORÍA] - YYYY-MM-DD

### 🚨 Título descriptivo

**Error cometido:** [qué pasó]

**Contexto:** [cuándo, en qué tarea]

**Impacto:** [consecuencias]

**Causa raíz:** [por qué ocurrió]

**Proceso CORRECTO:**
[pasos que deben seguirse]

**Compromiso:**
- ✅ [acción concreta]

**Señales de alerta:**
- 🚨 [cuándo detenerme]
```

---

**Mantenido por:** Equipo de Desarrollo TNS
**Lecciones heredadas de:** Metodología TNS Track (api-bitumix) — adaptadas a tns-cctv-pwa
