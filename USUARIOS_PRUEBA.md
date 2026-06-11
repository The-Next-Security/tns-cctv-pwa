# TNS Track - Usuarios y Credenciales de Prueba

## Usuarios Disponibles

El sistema está configurado con autenticación mockeada para permitir acceso rápido durante el desarrollo. **Cualquier combinación de email y contraseña válida funcionará**. A continuación se proporcionan usuarios sugeridos para cada rol:

### 1. Administrador de Parque
**Email:** `admin@agrolivo.cl`  
**Contraseña:** `password123` (o cualquier contraseña)  
**Rol:** `admin_parque`  
**Acceso a:** Todas las módulos (Operación, Recepción, Expedientes, Reglas, Reportes, Salud, Admin)  
**Descripción:** Acceso completo al sistema. Puede gestionar usuarios, zonas, cámaras, NVRs, crear reglas y ver todos los reportes.

---

### 2. Jefe de Seguridad
**Email:** `jefe.seguridad@agrolivo.cl`  
**Contraseña:** `password123` (o cualquier contraseña)  
**Rol:** `jefe_seguridad`  
**Acceso a:** Operación, Recepción, Expedientes, Reportes, Salud  
**Descripción:** Control total de operaciones de seguridad. Puede ver alertas, gestionar infracciones vehiculares, crear reglas y acceder a reportes.

---

### 3. Operador de Consola
**Email:** `operador@agrolivo.cl`  
**Contraseña:** `password123` (o cualquier contraseña)  
**Rol:** `operador_consola`  
**Acceso a:** Operación, Recepción, Expedientes, Reportes  
**Descripción:** Monitora alertas en tiempo real y registra vehículos. Puede escalar alertas críticas pero no crear reglas.

---

### 4. Recepcionista
**Email:** `recepcionista@agrolivo.cl`  
**Contraseña:** `password123` (o cualquier contraseña)  
**Rol:** `recepcionista`  
**Acceso a:** Recepción, Expedientes  
**Descripción:** Registra ingresos/salidas de vehículos y consulta expedientes. Acceso limitado al sistema.

---

### 5. Auditor
**Email:** `auditor@agrolivo.cl`  
**Contraseña:** `password123` (o cualquier contraseña)  
**Rol:** `auditor`  
**Acceso a:** Operación, Expedientes, Reportes, Salud  
**Descripción:** Solo lectura. Puede auditar operaciones pero no realizar acciones operativas.

---

## Instrucciones de Acceso

### Opción 1: Usar usuarios predefinidos
1. Ir a http://localhost:3000/login
2. Ingresar cualquiera de los emails listados arriba
3. Ingresar cualquier contraseña (ej: `password123`)
4. Hacer clic en "Ingresar"

### Opción 2: Crear usuarios personalizados
El sistema está configurado con autenticación mockeada. Puedes ingresar **cualquier email y contraseña válidos** y se creará automáticamente una sesión con rol `admin_parque`:

- Email: `tu-email@tudominio.com`
- Contraseña: `cualquier-password`

---

## Características por Rol

### admin_parque (Administrador)
- ✅ Ver Consola Operativa
- ✅ Registrar vehículos
- ✅ Gestionar expedientes
- ✅ Crear y editar reglas
- ✅ Ver reportes
- ✅ Monitorear salud del sistema
- ✅ **Administración**: Usuarios, Zonas, Cámaras, NVRs, Tenants, Configuración

### jefe_seguridad (Jefe de Seguridad)
- ✅ Ver Consola Operativa
- ✅ Registrar vehículos
- ✅ Gestionar expedientes
- ✅ Crear y editar reglas
- ✅ Ver reportes
- ✅ Monitorear salud del sistema
- ❌ Administración restringida

### operador_consola (Operador)
- ✅ Ver Consola Operativa
- ✅ Registrar vehículos
- ✅ Gestionar expedientes
- ✅ Ver reportes
- ❌ Crear/editar reglas
- ❌ Acceso a Salud

### recepcionista (Recepcionista)
- ❌ Consola Operativa
- ✅ Registrar vehículos
- ✅ Gestionar expedientes
- ❌ Reportes
- ❌ Salud
- ❌ Administración

### auditor (Auditor)
- ✅ Ver Consola Operativa (solo lectura)
- ❌ Registrar vehículos
- ✅ Ver expedientes (solo lectura)
- ✅ Ver reportes (solo lectura)
- ✅ Monitorear salud (solo lectura)
- ❌ Administración

---

## Nota Importante

**El sistema actual usa autenticación mockeada** para desarrollo y pruebas rápidas. Para producción, necesitas:

1. Conectar un backend real de autenticación
2. Integrar con un servidor de bases de datos (Neon, Supabase, etc.)
3. Implementar JWT o sesiones seguras
4. Remover el código mock del archivo `/components/providers/auth-provider.tsx`

---

## Rutas Disponibles

- `/` → Redirige a `/operacion`
- `/login` → Pantalla de login
- `/operacion` → Consola Operativa (principal)
- `/recepcion` → Registro de vehículos
- `/expedientes` → Gestión de infracciones
- `/reglas` → Editor de reglas operativas
- `/reportes` → Reportes y KPIs
- `/salud` → Salud técnica del sistema
- `/admin` → Panel de administración
  - `/admin/usuarios` → Gestión de usuarios
  - `/admin/zonas` → Gestión de zonas
  - `/admin/camaras` → Gestión de cámaras
  - `/admin/nvrs` → Gestión de NVRs
  - `/admin/tenants` → Gestión de tenants
  - `/admin/configuracion` → Configuración del sistema

---

## Próximos Pasos de Desarrollo

Para completar el sistema, implementa:

1. **Backend API** - Endpoints para CRUD de todas las entidades
2. **Base de datos** - Schema SQL con todas las tablas
3. **WebSocket** - Conexión en tiempo real para alertas y eventos
4. **Integración Dahua** - Consumo de eventos de cámaras
5. **Autenticación real** - Better Auth o supabase-auth
6. **Tests E2E** - Verificación de flujos completos
