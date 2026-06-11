# TNS Track - Sistema de Monitoreo de Seguridad

Consola de operaciones de seguridad para Parque Industrial Agrolivo. Sistema completo para monitoreo de eventos de cámaras Dahua, gestión de alertas, registro vehicular y trazabilidad de operaciones.

## Características Principales

- **Consola Operativa** - Monitoreo en tiempo real de alertas con filtros avanzados
- **Registro Vehicular** - Control de ingreso/salida con validación de datos
- **Gestión de Expedientes** - Cruce de infracciones con registros de entrada (búsqueda fuzzy)
- **Reglas Operativas** - Editor visual para crear reglas por zona, cámara y horario
- **Reportes** - 6 KPIs con gráficos (alertas, tiempo de respuesta, distribución de criticidad, etc.)
- **Salud Técnica** - Monitoreo de NVRs, colas y conexiones WebSocket
- **Administración** - Gestión de usuarios, zonas, cámaras, NVRs, tenants y configuración
- **RBAC** - 5 roles con permisos específicos (Admin, Jefe Seguridad, Operador, Recepcionista, Auditor)
- **Dark Mode** - Interfaz profesional optimizada para control operativo 24/7

## Stack Técnico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4 + shadcn/ui
- **Gráficos**: Recharts
- **Autenticación**: AuthContext + localStorage (mockeada para demo)
- **Formularios**: react-hook-form + Zod
- **Data Fetching**: SWR (preconfigurable)
- **Tiempo Real**: socket.io-client (preconfigurable)

## Instalación

```bash
# Clonar o descargar el proyecto
git clone <repo-url>
cd tns-track

# Instalar dependencias
pnpm install

# Ejecutar servidor de desarrollo
pnpm dev
```

El servidor estará disponible en http://localhost:3000

## Acceso Inicial

### Usuarios de Prueba

El sistema está configurado con autenticación mockeada. **Cualquier email y contraseña válidos funcionan**.

Usuarios sugeridos:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@agrolivo.cl` | `password123` |
| Jefe Seguridad | `jefe.seguridad@agrolivo.cl` | `password123` |
| Operador | `operador@agrolivo.cl` | `password123` |
| Recepcionista | `recepcionista@agrolivo.cl` | `password123` |
| Auditor | `auditor@agrolivo.cl` | `password123` |

Ver `USUARIOS_PRUEBA.md` para más detalles de roles y permisos.

## Estructura de Carpetas

```
src/
├── app/
│   ├── (auth)/              # Rutas de autenticación
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/         # Rutas protegidas
│   │   ├── operacion/       # Consola operativa
│   │   ├── recepcion/       # Registro vehicular
│   │   ├── expedientes/     # Gestión de infracciones
│   │   ├── reglas/          # Editor de reglas
│   │   ├── reportes/        # Reportes y KPIs
│   │   ├── salud/           # Salud técnica
│   │   ├── admin/           # Administración
│   │   └── layout.tsx
│   ├── layout.tsx           # Layout raíz
│   ├── globals.css          # Estilos globales
│   └── page.tsx             # Redirect a /operacion
├── components/
│   ├── layout/              # Componentes del layout (sidebar, topbar)
│   ├── operacion/           # Componentes de consola operativa
│   ├── providers/           # Providers (Auth, Theme)
│   └── ui/                  # Componentes shadcn/ui
├── hooks/                   # Hooks personalizados
├── lib/
│   ├── types.ts             # Tipos TypeScript
│   ├── auth.ts              # Lógica de autenticación
│   ├── api.ts               # Cliente API (preparado para backend)
│   └── utils.ts
└── public/                  # Archivos estáticos
```

## Rutas Disponibles

| Ruta | Descripción | Roles |
|------|-------------|-------|
| `/login` | Página de login | Público |
| `/operacion` | Consola Operativa (principal) | Admin, Jefe, Operador, Auditor |
| `/recepcion` | Registro de vehículos | Admin, Jefe, Operador, Recepcionista |
| `/expedientes` | Gestión de infracciones | Admin, Jefe, Operador, Recepcionista, Auditor |
| `/reglas` | Editor de reglas | Admin, Jefe |
| `/reportes` | Reportes y KPIs | Admin, Jefe, Operador, Auditor |
| `/salud` | Salud técnica | Admin, Jefe, Auditor |
| `/admin` | Panel de administración | Admin |
| `/admin/usuarios` | Gestión de usuarios | Admin |
| `/admin/zonas` | Gestión de zonas | Admin |
| `/admin/camaras` | Gestión de cámaras | Admin |
| `/admin/nvrs` | Gestión de NVRs | Admin |
| `/admin/tenants` | Gestión de tenants | Admin |
| `/admin/configuracion` | Configuración del sistema | Admin |

## Integración con Backend

El sistema está preparado para conectar un backend real. Para implementar:

### 1. Autenticación Real
Actualizar `/lib/auth.ts` y `/components/providers/auth-provider.tsx`:
- Reemplazar mock con llamadas a tu API de autenticación
- Implementar JWT o sesiones seguras
- Agregar refresh tokens

### 2. API Client
Completar `/lib/api.ts` con endpoints:
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`
- CRUD para todas las entidades (alertas, vehículos, expedientes, etc.)

### 3. WebSocket
Implementar conexión en tiempo real:
```typescript
import io from 'socket.io-client'

const socket = io('http://localhost:3001', {
  auth: { token: localStorage.getItem('token') }
})

socket.on('alerta:nueva', (data) => {
  // Actualizar alertas en tiempo real
})
```

### 4. Base de Datos
Schema sugerido con Neon/Supabase:
```sql
-- Usuarios
CREATE TABLE usuarios (...)

-- Zonas de vigilancia
CREATE TABLE zonas (...)

-- Cámaras Dahua
CREATE TABLE camaras (...)

-- NVRs
CREATE TABLE nvrs (...)

-- Alertas
CREATE TABLE alertas (...)

-- Vehículos
CREATE TABLE vehiculos (...)

-- Expedientes
CREATE TABLE expedientes (...)
```

## Desarrollo

### Agregar nuevas dependencias
```bash
pnpm add <package-name>
```

### Compilar para producción
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

## Características por Implementar

- [ ] Conexión real a API backend
- [ ] WebSocket para alertas en tiempo real
- [ ] Base de datos con Neon/Supabase
- [ ] Autenticación con Better Auth
- [ ] Integración con cámaras Dahua
- [ ] Búsqueda fuzzy para expedientes
- [ ] Filtros avanzados por fecha/rango
- [ ] Exportar reportes a PDF/Excel
- [ ] Notificaciones push
- [ ] Auditoría de acciones
- [ ] Tests E2E
- [ ] CI/CD con GitHub Actions

## Despliegue

### En Vercel (recomendado)
```bash
# Conectar a GitHub
git push origin main

# Vercel desplegará automáticamente
```

O:
```bash
vercel
```

### En otros servidores
```bash
# Build
pnpm build

# Server
pnpm start
```

## Variables de Entorno

Crear archivo `.env.local`:
```env
# API Backend (cuando se implemente)
NEXT_PUBLIC_API_URL=http://localhost:3001

# WebSocket (cuando se implemente)
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Otros
NEXT_PUBLIC_APP_NAME=TNS Track
```

## Documentación

- `USUARIOS_PRUEBA.md` - Usuarios y credenciales disponibles
- Componentes shadcn/ui: https://ui.shadcn.com
- Next.js: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Recharts: https://recharts.org

## Soporte

Para reportar bugs o sugerencias, crear un issue en GitHub o contactar al equipo de desarrollo.

## Licencia

Propietario - The Next Security

---

**Desenvolvido por v0 - Vercel's AI-powered Assistant**
