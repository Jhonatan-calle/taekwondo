#!/usr/bin/env bash
# ============================================================
# aplicar-maestro-prueba.sh
# Proyecto: Taekwondo ITF
# Fecha: 2026-09-24
#
# Deja listo el "Maestro Prueba" para TC-MES-08 en UN comando:
#   1) Crea/verifica la cuenta maestro2@taekwondo.test (Admin API).
#   2) Corre el seed de prueba (supabase/seed-auditoria.sql), que
#      crea el perfil "Maestro Prueba" y SU propia mesa.
#
# USO:
#   SEED_PASSWORD='<contraseña de test>' bash supabase/aplicar-maestro-prueba.sh
#
# CREDENCIALES:
#   Toma las credenciales de variables de entorno si están definidas;
#   si no, las lee del archivo local CREDENCIALES_FILE (por defecto
#   ./credenciales.txt). Este script NO contiene secretos.
#   Variables de entorno aceptadas:
#     SUPABASE_URL
#     SUPABASE_SERVICE_ROLE_KEY   (o el secret key del proyecto)
#     SUPABASE_ACCESS_TOKEN       (token de la CLI para el seed)
#     SEED_PASSWORD               (obligatoria; contraseña de test)
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CRED_FILE="${CREDENCIALES_FILE:-credenciales.txt}"
EMAIL="maestro2@taekwondo.test"
RESP_FILE="${TMPDIR:-/tmp}/opencode-crear-usuario.json"

# --- 1. Resolver credenciales (env > archivo local) ---
URL="${SUPABASE_URL:-}"
SECRET="${SUPABASE_SERVICE_ROLE_KEY:-}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

if { [ -z "$URL" ] || [ -z "$SECRET" ] || [ -z "$TOKEN" ]; } && [ -f "$CRED_FILE" ]; then
  [ -z "$URL" ]    && URL="$(grep -m1 -E '^https://' "$CRED_FILE" | tr -d '[:space:]' || true)"
  [ -z "$SECRET" ] && SECRET="$(grep -m1 -E '^sb_secret_' "$CRED_FILE" | tr -d '[:space:]' || true)"
  [ -z "$TOKEN" ]  && TOKEN="$(grep -m1 -E '^sbp_' "$CRED_FILE" | tr -d '[:space:]' || true)"
fi

: "${URL:?Falta SUPABASE_URL (env o '$CRED_FILE')}"
: "${SECRET:?Falta SUPABASE_SERVICE_ROLE_KEY (env o '$CRED_FILE')}"
: "${TOKEN:?Falta SUPABASE_ACCESS_TOKEN (env o '$CRED_FILE')}"
: "${SEED_PASSWORD:?Definí SEED_PASSWORD (la contraseña de test de las cuentas seed)}"

# --- 2. Crear/verificar la cuenta del Maestro Prueba ---
echo "→ Creando/verificando la cuenta $EMAIL ..."
CODE="$(curl -s -o "$RESP_FILE" -w '%{http_code}' \
  -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $SECRET" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$SEED_PASSWORD\",\"email_confirm\":true}")"

case "$CODE" in
  200|201) echo "   ✔ cuenta creada" ;;
  409|422) echo "   ℹ la cuenta ya existía (ok)" ;;
  *) echo "   ✖ error $CODE:"; cat "$RESP_FILE"; echo; exit 1 ;;
esac

# --- 3. Correr el seed (crea el perfil + su mesa) ---
echo "→ Aplicando el seed (supabase/seed-auditoria.sql) ..."
SUPABASE_ACCESS_TOKEN="$TOKEN" npx supabase db query --linked -f supabase/seed-auditoria.sql

echo
echo "✔ Listo. Probá TC-MES-08 con maestro2@taekwondo.test."
