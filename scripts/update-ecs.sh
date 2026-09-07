#!/usr/bin/env bash
# ECS 滚动更新（GitHub Actions 或手动）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/deploy/.env.ecs}"
DEPLOY_DIR="${DEPLOY_DIR:-$REPO_ROOT/deploy}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 $ENV_FILE" >&2
  echo "请在 ECS 执行：cp deploy/.env.ecs.example deploy/.env.ecs && 编辑后重跑 Actions" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PROJECT_NAME="${PROJECT_NAME:-footprint-prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.ecs.yml}"

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

if [[ -n "${RETAG_API:-}" ]]; then
  runtime="${RUNTIME_API_TAG:-${FOOTPRINT_IMAGE:-footprint-api:ecs}}"
  docker tag "$RETAG_API" "$runtime"
  echo "已 retag：$RETAG_API -> $runtime"
fi

echo "== 重启 API =="
compose up -d --no-build

for i in $(seq 1 25); do
  curl -sf http://127.0.0.1:3000/health >/dev/null 2>&1 && break
  sleep 2
  [[ "$i" -eq 25 ]] && { compose logs --tail=50 api; exit 1; }
done

compose ps
echo "更新完成"
