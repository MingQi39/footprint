#!/usr/bin/env bash
# ECS 首次安装（在服务器执行一次；后续由 GitHub Actions 更新镜像）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$REPO_ROOT/deploy}"
ENV_TEMPLATE="$DEPLOY_DIR/.env.ecs.example"
ENV_FILE="${ENV_FILE:-$DEPLOY_DIR/.env.ecs}"

log() { echo "[footprint install] $*"; }

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "请使用 root 或 sudo 运行" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  log "未检测到 Docker"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  log "从模板生成 $ENV_FILE"
  cp "$ENV_TEMPLATE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  while IFS= read -r line; do
    key="${line%%=*}"
    value=$(openssl rand -hex 32)
    sed -i "s|^${key}=PLEASE_GENERATE\$|${key}=${value}|" "$ENV_FILE"
  done < <(grep '=PLEASE_GENERATE' "$ENV_FILE")
  log "已自动生成 DB/JWT，请编辑微信、PUBLIC_BASE_URL 等"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

COMPOSE_FILE="$DEPLOY_DIR/docker-compose.ecs.yml"

mkdir -p /data/footprint/mysql /data/footprint/uploads

compose() {
  docker compose -p "${PROJECT_NAME:-footprint-prod}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

IMAGE="${FOOTPRINT_IMAGE:-footprint-api:ecs}"
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  log "本地无镜像 $IMAGE，请先 GitHub Actions 部署或 docker build"
  exit 1
fi

log "启动服务"
compose up -d --no-build

for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:3000/health >/dev/null 2>&1 && break
  sleep 2
  [[ "$i" -eq 30 ]] && { compose logs api; exit 1; }
done

compose ps
log "安装完成。API 监听 3000 端口。"
