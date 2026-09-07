#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/deploy/.env.ecs}"
DEPLOY_DIR="${DEPLOY_DIR:-$REPO_ROOT/deploy}"

PROJECT_NAME=footprint-prod
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

COMPOSE_FILE="$DEPLOY_DIR/docker-compose.ecs.yml"

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true
echo "可选：sudo rm -rf /data/footprint"
echo "卸载完成"
