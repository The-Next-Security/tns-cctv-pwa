# TNS Track - Instrucciones de Acceso

## URL Principal

Accede a: **http://localhost:3000**

Serás redirigido automáticamente a: **http://localhost:3000/login**

## Cómo Hacer Login

### Opción 1: Usar los Botones de Prueba (Recomendado)

1. En la página de login, verás una sección "USUARIOS DE PRUEBA" al pie del formulario
2. Haz click en uno de estos botones:
   - **Admin** → admin@agrolivo.cl
   - **Operador** → operador@agrolivo.cl
   - **Recepcionista** → recepcionista@agrolivo.cl
3. El formulario se auto-rellena automáticamente
4. Haz click en "Iniciar sesión"
5. Serás redirigido a la Consola Operativa

### Opción 2: Escribir Manualmente

1. Correo: `admin@agrolivo.cl` (o cualquier usuario de prueba)
2. Contraseña: `password123` (o cualquier contraseña)
3. Haz click en "Iniciar sesión"

## Problemas Comunes

### El navegador muestra una página en blanco

**Solución:**
- Presiona F5 para recargar la página
- Abre la consola de desarrollador (F12) y revisa si hay errores en rojo
- Intenta vaciar el caché: Ctrl+Shift+Del

### Se queda en la página de login después de hacer click en "Iniciar sesión"

**Solución:**
- Asegúrate de que ingresaste un correo válido
- La contraseña puede ser cualquiera en modo demo
- Intenta con: admin@agrolivo.cl / password123
- Si persiste, recarga la página (F5)

### El servidor dice que no está disponible

**Solución:**
- El servidor dev debe estar corriendo en puerto 3000
- Si se detiene, necesita ser reiniciado: `pnpm dev` en la carpeta del proyecto

## Páginas Disponibles Después de Login

Una vez autenticado, tienes acceso a:

- **Consola Operativa** (`/operacion`) - Monitoreo de alertas en tiempo real
- **Registro Vehicular** (`/recepcion`) - Ingreso/salida de vehículos
- **Expedientes** (`/expedientes`) - Gestión de infracciones
- **Reglas Operativas** (`/reglas`) - Configuración de reglas
- **Reportes** (`/reportes`) - Gráficos y KPIs
- **Salud Técnica** (`/salud`) - Estado del sistema
- **Administración** (`/admin`) - Gestión de usuarios, zonas, cámaras, etc.

## Navegación

- Usa el **sidebar lateral** para navegar entre secciones
- El **top bar** muestra tu usuario y estado del sistema
- En pantallas pequeñas (móvil), haz click en el ícono de menú (hamburguesa)

## Información Técnica

- **Autenticación:** Mock en localStorage (para desarrollo)
- **Base de datos:** No hay backend real (interfaz de demostración)
- **Sesión:** Se mantiene mientras tengas las cookies
- **Para salir:** Recarga la página o borra el localStorage

---

¿Necesitas ayuda? Revisa la sección README.md para más detalles técnicos.
