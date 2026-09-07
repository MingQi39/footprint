#!/usr/bin/env bash
# 将 deploy/.env.ecs 上传到 ECS（需已填写 WX_SECRET）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/deploy/.env.ecs"

ECS_HOST="${ECS_HOST:-43.143.251.51}"
ECS_USER="${ECS_USER:-ubuntu}"
ECS_PORT="${ECS_PORT:-22}"
ECS_DEPLOY_DIR="${ECS_DEPLOY_DIR:-/opt/footprint-deploy}"
ECS_SSH_KEY="${ECS_SSH_KEY:-$HOME/.ssh/id_ed25519_personal}"

ssh_cmd() {
  ssh -i "$ECS_SSH_KEY" -p "$ECS_PORT" "$ECS_USER@$ECS_HOST" "$@"
}

scp_cmd() {
  scp -i "$ECS_SSH_KEY" -P "$ECS_PORT" "$@"
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 $ENV_FILE" >&2
  exit 1
fi

if ! grep -qE '^WX_SECRET=.+' "$ENV_FILE"; then
  echo "请先在 deploy/.env.ecs 填写 WX_SECRET（微信公众平台 → 开发 → 开发管理 → 开发设置）" >&2
  exit 1
fi

ssh_cmd "mkdir -p '$ECS_DEPLOY_DIR/deploy'"
scp_cmd "$ENV_FILE" "$ECS_USER@$ECS_HOST:$ECS_DEPLOY_DIR/deploy/.env.ecs"
ssh_cmd "chmod 600 '$ECS_DEPLOY_DIR/deploy/.env.ecs'"
echo "已上传至 $ECS_USER@$ECS_HOST:$ECS_DEPLOY_DIR/deploy/.env.ecs"
