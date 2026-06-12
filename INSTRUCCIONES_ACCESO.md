# TNS Track - Instrucciones de Acceso

> La autenticación es **real** (JWT + bcrypt contra MySQL) desde el Paso 2 de seguridad.
> Usuarios y contraseña de desarrollo: ver [USUARIOS_PRUEBA.md](./USUARIOS_PRUEBA.md).
> Actualizado: 2026-06-11 (QA-12 / [#53](https://github.com/The-Next-Security/tns-cctv-pwa/issues/53)).

## Levantar el entorno

```bash
npm install
npm run db:verify   # valida el bundle SQL (37 tablas)
npm run dev         # web :3000 + api :4000 (STORE=mysql)
```

Requisitos:
- MySQL local con el schema de `db/sql_files/` aplicado (orquestador en `db/`).
- `db/connection-config.json` presente (gitignored — copiarlo del repo principal
  si trabajas en un worktree).
- Para Web Push (D9): `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en el entorno
  (generar con `npx web-push generate-vapid-keys`; sin ellas el push queda
  deshabilitado y el backend solo lo loggea).

## Cómo hacer login

1. Abre **http://localhost:3000** (redirige a `/login`).
2. Opción rápida: botones **Admin / Operador / Recepción** — auto-rellenan email
   y contraseña de desarrollo.
3. Opción manual: email del seed + `password123`.
4. Click en "Iniciar sesión" → redirige a la Consola Operativa (`/operacion`).

⚠️ Una contraseña incorrecta devuelve **401 "Correo o contraseña incorrectos"**
(el modo "cualquier contraseña funciona" ya no existe).

## Sesión

- El access token dura 60 min; el AuthProvider lo renueva solo (refresh rotativo,
  tope 10 h).
- Si reinicias el backend, los refresh tokens se invalidan → vuelve a loguear.
- Para salir: botón de logout (limpia `tns_token` y `tns_refresh_token`).

## Páginas disponibles después del login

El menú se filtra por rol (ver USUARIOS_PRUEBA.md). Con `admin_parque` ves todo:

- **Consola Operativa** (`/operacion`) — alertas en tiempo real (WS autenticado)
- **Registro Vehicular** (`/recepcion`) — ingreso/salida de vehículos (BD real)
- **Expedientes** (`/expedientes`) — gestión de infracciones
- **Reglas Operativas** (`/reglas`) — editor de reglas (desktop)
- **Reportes** (`/reportes`) — gráficos y KPIs
- **Salud Técnica** (`/salud`) — estado real de NVRs vía `/health/nvrs`
- **Administración** (`/admin`) — usuarios, zonas, cámaras, NVRs, tenants, configuración
- **Design system** (`/admin/design-system`) — referencia de UI

## Problemas comunes

### "Correo o contraseña incorrectos"
- Verifica que usas un usuario del seed con `password123` (USUARIOS_PRUEBA.md).
- Si cambiaste datos de usuarios en pruebas, re-aplica el seed
  (`07_01_datos_iniciales.sql` es idempotente: `ON DUPLICATE KEY UPDATE`).

### La sesión se cierra sola tras reiniciar el backend
- Esperado: las sesiones de refresh viven en memoria (D10). Vuelve a loguear.

### El API responde 401 en todo
- El token expiró o el backend se reinició. Logout + login.
- Recuerda: solo `/auth/login`, `/auth/refresh` y `/health/*` son públicos.

### El servidor no está disponible
- `npm run dev` debe estar corriendo (web :3000, api :4000).
- Si la web carga pero los datos no, revisa que el api esté arriba y que
  `db/connection-config.json` exista.

---

¿Más detalle técnico? `README.md`, `HANDOFF.md` y `02-design/ARCHITECTURE.md`.
