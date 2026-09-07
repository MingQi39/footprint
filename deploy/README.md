# footprint ECS 部署

Node(Fastify) + MySQL 足迹地图 API，与 bf-kitchen、LIMS 独立 compose 项目 `footprint-prod`，监听服务器 **3000** 端口。

## 目录

```
deploy/
  docker-compose.ecs.yml       API 与 MySQL 服务
  .env.ecs.example
scripts/
  install-ecs.sh                 ECS 首次安装
  update-ecs.sh                  手动 / CI 更新
  deploy-github-ecs.sh           CI 入口
  uninstall-ecs.sh
  push-env-ecs.sh                本地上传 .env.ecs
.github/workflows/deploy.yml     push main 自动部署 + 飞书通知
```

## 首次 ECS 准备（与 bf-kitchen 同机）

```bash
sudo mkdir -p /opt/footprint-deploy
cd /opt/footprint-deploy
# 等 GitHub Actions 同步 deploy/ 与 scripts/ 后：
sudo cp deploy/.env.ecs.example deploy/.env.ecs
sudo vim deploy/.env.ecs
sudo bash scripts/install-ecs.sh
```

数据目录：`/data/footprint/mysql`、`/data/footprint/uploads`

## GitHub Actions

Environment **`production`** 配置 Secrets（与 bf-kitchen 相同服务器，复用同一套）：

| Secret | 说明 |
|--------|------|
| `ECS_SSH_PRIVATE_KEY` | SSH 私钥 |
| `ECS_HOST` | ECS 地址 |
| `ECS_USER` | 如 `ubuntu` |
| `ECS_PORT` | 可选，默认 22 |
| `FEISHU_APP_SECRET` | 飞书应用密钥（同 bf-kitchen 群通知） |

可选 Variables：`ECS_DEPLOY_DIR`、`ECS_ENV_FILE`、`ECS_COMPOSE_FILE`（见 workflow 默认值）。

触发：`push main` 或 workflow_dispatch。

## Nginx（宿主机）

在 ECS 宿主机 Nginx 增加站点（示例）：

```nginx
server {
    listen 443 ssl http2;
    server_name footprint.houmq.cn;

    include /etc/nginx/conf.d/footprint-api-upload.conf;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

小程序 `miniprogram/config.js` 的 `baseUrl` 改为 `https://footprint.houmq.cn/v1`（或你的实际域名）。

## 与 bf-kitchen 同机

| 项目 | 端口 | 数据目录 | Compose 项目名 |
|------|------|----------|----------------|
| bf-kitchen | 8000 | `/data/bf-kitchen/` | `bf-kitchen-prod` |
| footprint | 3000 | `/data/footprint/` | `footprint-prod` |
