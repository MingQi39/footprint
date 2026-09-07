#!/usr/bin/env bash
# GitHub Actions 入口：retag 并 update-ecs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/deploy/.env.ecs}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/deploy/docker-compose.ecs.yml}"
PROJECT_NAME="${PROJECT_NAME:-footprint-prod}"

export ENV_FILE COMPOSE_FILE PROJECT_NAME REPO_ROOT
bash "$SCRIPT_DIR/update-ecs.sh"
