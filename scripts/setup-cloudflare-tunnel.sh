#!/usr/bin/env bash
# Configura un Cloudflare Tunnel nombrado para exponer el dev server local.
# Uso: ./scripts/setup-cloudflare-tunnel.sh [subdominio]
# Ejemplo: ./scripts/setup-cloudflare-tunnel.sh cctv-dev.thenextsecurity.cl

set -euo pipefail

TUNNEL_NAME="${TUNNEL_NAME:-tns-cctv-dev}"
LOCAL_PORT="${LOCAL_PORT:-3000}"
HOSTNAME="${1:-${TUNNEL_HOSTNAME:-}}"
CLOUDFLARED_DIR="${HOME}/.cloudflared"
CONFIG_FILE="${CLOUDFLARED_DIR}/config.yml"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "❌ cloudflared no está instalado. Instálalo con: brew install cloudflared"
  exit 1
fi

if [[ ! -f "${CLOUDFLARED_DIR}/cert.pem" ]]; then
  echo "🔐 Primero debes autenticarte con Cloudflare."
  echo "   Ejecuta: cloudflared tunnel login"
  echo "   (Se abrirá el navegador; inicia sesión con felipev7450@gmail.com y autoriza un dominio.)"
  exit 1
fi

if [[ -z "${HOSTNAME}" ]]; then
  echo "❌ Falta el hostname. Pásalo como argumento o define TUNNEL_HOSTNAME."
  echo "   Ejemplo: ./scripts/setup-cloudflare-tunnel.sh cctv-dev.thenextsecurity.cl"
  exit 1
fi

echo "📡 Creando tunnel '${TUNNEL_NAME}' (si no existe)..."
if cloudflared tunnel list 2>/dev/null | grep -q "${TUNNEL_NAME}"; then
  echo "   Tunnel '${TUNNEL_NAME}' ya existe."
  TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data:
    if t.get('name') == '${TUNNEL_NAME}':
        print(t['id'])
        break
" 2>/dev/null || true)
else
  cloudflared tunnel create "${TUNNEL_NAME}"
  TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data:
    if t.get('name') == '${TUNNEL_NAME}':
        print(t['id'])
        break
")
fi

if [[ -z "${TUNNEL_ID:-}" ]]; then
  TUNNEL_ID=$(cloudflared tunnel info "${TUNNEL_NAME}" 2>/dev/null | awk '/ID:/ {print $2}' || true)
fi

CREDS_FILE="${CLOUDFLARED_DIR}/${TUNNEL_ID}.json"
if [[ ! -f "${CREDS_FILE}" ]]; then
  # cloudflared tunnel create también puede dejar creds con el nombre del tunnel
  CREDS_FILE="${CLOUDFLARED_DIR}/${TUNNEL_NAME}.json"
fi

if [[ ! -f "${CREDS_FILE}" ]]; then
  echo "❌ No se encontró el archivo de credenciales del tunnel en ${CLOUDFLARED_DIR}"
  ls -la "${CLOUDFLARED_DIR}"
  exit 1
fi

echo "📝 Escribiendo ${CONFIG_FILE}..."
mkdir -p "${CLOUDFLARED_DIR}"
cat > "${CONFIG_FILE}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS_FILE}

ingress:
  - hostname: ${HOSTNAME}
    service: http://localhost:${LOCAL_PORT}
  - service: http_status:404
EOF

echo "🌐 Registrando DNS: ${HOSTNAME} → tunnel ${TUNNEL_NAME}..."
cloudflared tunnel route dns "${TUNNEL_NAME}" "${HOSTNAME}" || {
  echo "⚠️  La ruta DNS puede existir ya. Continúa si el CNAME ya apunta al tunnel."
}

echo ""
echo "✅ Configuración lista."
echo ""
echo "Para usar desde Android (fuera de tu red):"
echo "  1. Terminal A: npm run dev          # o pnpm dev"
echo "  2. Terminal B: cloudflared tunnel run ${TUNNEL_NAME}"
echo "  3. Abre en el móvil: https://${HOSTNAME}"
echo ""
echo "Nota: agrega '${HOSTNAME}' (o su wildcard) en next.config.mjs → allowedDevOrigins si Next muestra bloqueo de origen en dev."
