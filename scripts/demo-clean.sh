#!/usr/bin/env bash
# Demo en limpio: reinicia SOLO el pipeline de alertas simuladas (NVR → motor de reglas).
#
# Uso:
#   npm run demo:clean
#   bash scripts/demo-clean.sh
#   bash scripts/demo-clean.sh --strict   # falla si 3000/4000 están ocupados (no mata procesos)
#
# Requisitos previos (una sola vez):
#   - db/connection-config.json configurado
#   - Base creada con crear_base_datos.sql + 07_01_datos_iniciales.sql
#
# Qué PRESERVA (no borra ni reescribe):
#   - ale_regla          (reglas operativas, p. ej. Regla-0001 Intrusion perimetral nocturna)
#   - src_fuente         (cámaras / fuentes NVR)
#   - gen_*              (tenant, usuarios, permisos)
#   - adm_ingreso        (registros vehiculares de recepción)
#
# Qué REINICIA en cada ejecución (solo datos simulados del pipeline):
#   - ale_evento         (alertas)
#   - dah_evento_crudo   (eventos crudos NVR)
#   - log_evento_timeline (historial de estados de esas alertas)
#   - src_idempotencia_ingesta (clave ingest_events del tenant demo)
#
# NO usar migraciones legacy 08_02_reset_alertas_sin_atender.sql: el seed NVR las reemplaza.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}$*${NC}"; }
ok() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

STRICT_MODE=false
[[ "${1:-}" == "--strict" ]] && STRICT_MODE=true

port_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u
    return 0
  fi
  return 1
}

port_in_use() {
  local port="$1"
  local pids
  pids="$(port_pids "$port" || true)"
  [[ -n "$pids" ]]
}

stop_port_listeners() {
  local port="$1"
  local pids
  pids="$(port_pids "$port" || true)"
  [[ -z "$pids" ]] && return 0

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    local cmd
    cmd="$(ps -p "$pid" -o comm= 2>/dev/null || echo "?")"
    warn "Deteniendo puerto ${port}: PID ${pid} (${cmd})"
    kill -TERM "$pid" 2>/dev/null || true
  done <<< "$pids"

  sleep 1

  pids="$(port_pids "$port" || true)"
  if [[ -n "$pids" ]]; then
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      warn "Forzando cierre en puerto ${port}: PID ${pid}"
      kill -KILL "$pid" 2>/dev/null || true
    done <<< "$pids"
    sleep 0.5
  fi
}

free_dev_ports() {
  local busy=false
  for port in 4000 3000; do
    if port_in_use "$port"; then
      busy=true
    fi
  done

  if [[ "$busy" == false ]]; then
    ok "Puertos 4000 y 3000 libres"
    return 0
  fi

  if [[ "$STRICT_MODE" == true ]]; then
    fail "Puertos 4000/3000 en uso. Detén API y Next.js o ejecuta sin --strict."
  fi

  log "Liberando puertos de desarrollo (4000 API, 3000 web)…"
  stop_port_listeners 4000
  stop_port_listeners 3000

  for port in 4000 3000; do
    if port_in_use "$port"; then
      local pids
      pids="$(port_pids "$port" | tr '\n' ' ')"
      fail "Puerto ${port} sigue en uso (PID: ${pids}). Detén el proceso manualmente."
    fi
  done

  ok "Puertos 4000 y 3000 liberados"
}

run_pkg() {
  if command -v pnpm >/dev/null 2>&1 && [[ -f pnpm-lock.yaml ]]; then
    pnpm "$@"
  else
    npm "$@"
  fi
}

echo ""
log "🤖 TNS CCTV — Demo en limpio"
echo ""

# ── 1. Puertos de desarrollo libres ───────────────────────────────────────────
free_dev_ports

# ── 2. Configuración de BD ────────────────────────────────────────────────────
if [[ ! -f db/connection-config.json ]]; then
  fail "Falta db/connection-config.json — copia db/connection-config.template.json y completa credenciales."
fi
ok "db/connection-config.json presente"

# ── 3. Dependencias ───────────────────────────────────────────────────────────
if [[ ! -d node_modules ]]; then
  warn "node_modules no encontrado; instalando dependencias…"
  run_pkg install
fi

# ── 4. Preflight: esquema + seed base (sin tocar reglas ni ingresos) ──────────
log ""
log "Preflight: esquema, reglas, cámaras y usuarios demo…"
node scripts/ensure-demo-schema.mjs

# ── 5. Reinicio del pipeline NVR simulado (solo alertas) ──────────────────────
log ""
log "Reiniciando alertas simuladas vía motor de reglas (NVR ingest)…"
log "  · Se conservan ale_regla, src_fuente, adm_ingreso y usuarios"
log "  · Cada alerta nueva llevará matched_rule_ids + nombre de regla (Regla-XXXX)"
run_pkg run db:seed-nvr

# ── 6. Resumen para el operador ───────────────────────────────────────────────
echo ""
ok "Demo listo: alertas regeneradas con reglas aplicadas (IDs Regla-XXXX visibles en /operacion)"
echo ""
echo "  URL:        http://localhost:3000"
echo "  Operación:  http://localhost:3000/operacion"
echo "  Reglas:     http://localhost:3000/reglas"
echo "  Login:      admin@agrolivo.cl"
echo "  Password:   password123"
echo ""
warn "Para ver de nuevo el popup de alerta crítica, usa ventana privada"
warn "o borra sessionStorage (clave: tns_demo_alert_popup) en /operacion."
echo ""
log "🚀 Iniciando API (:4000) + frontend (:3000)…"
echo "   Ctrl+C para detener ambos servicios."
echo ""

if command -v pnpm >/dev/null 2>&1 && [[ -f pnpm-lock.yaml ]]; then
  exec pnpm run dev
else
  exec npm run dev
fi
