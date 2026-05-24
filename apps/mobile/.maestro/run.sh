#!/usr/bin/env bash
# Roda a suite Maestro carregando .maestro/.env e repassando cada var via -e
# (Maestro 2.x não auto-importa process env para substituição ${VAR}).
#
# Uso:
#   bash .maestro/run.sh                       # roda tudo (.maestro/flows)
#   bash .maestro/run.sh flows/exercises       # roda só uma pasta
#   bash .maestro/run.sh flows/auth/01-launch-and-render.yaml  # um flow
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

ENV_ARGS=()
while IFS='=' read -r key _; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  ENV_ARGS+=(-e "$key=${!key}")
done < <(grep -E '^[A-Z][A-Z0-9_]*=' "$ENV_FILE")

UDID=$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1)
if [[ -z "$UDID" ]]; then
  echo "Erro: nenhum simulador iOS booted. Rode: xcrun simctl boot \"iPhone 16\"" >&2
  exit 1
fi

TARGET="${1:-$SCRIPT_DIR}"

exec maestro --udid "$UDID" "${ENV_ARGS[@]}" test "$TARGET"
