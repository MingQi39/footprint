# 足迹地图 · Footprint

微信小程序 + Node(Fastify) + MySQL 全栈项目。

## 目录结构

```
footprint/
├── api/                 # 后端 API
├── miniprogram/         # 微信小程序
├── deploy/              # ECS 生产部署（docker-compose、env 模板、nginx 片段）
├── scripts/             # install / update / push-env 脚本
├── .github/workflows/   # GitHub Actions 自动部署 + 飞书通知
└── docker-compose.yml   # 本地 MySQL
```

## 本地开发

```bash
# 1. 启动 MySQL（端口 3307，避免与本机 3306 冲突）
docker compose up -d mysql

# 2. 启动 API
cd api
cp .env.example .env
# DATABASE_URL=mysql://footprint:footprint123@localhost:3307/footprint
npm install
npx prisma generate
npx prisma db push
npm run dev
```

小程序：微信开发者工具导入 `miniprogram/`，修改 `config.js` 中的 `baseUrl`。

## ECS 部署（与 bf-kitchen 同机同流程）

部署方式与 `bf-kitchen` 完全一致：

- GitHub Actions push `main` → SSH 到 ECS → 本地 `docker build` → `update-ecs.sh`
- 飞书通知同一个群（复用 `FEISHU_APP_SECRET`）
- 独立 compose 项目 `footprint-prod`，端口 **3000**，数据在 `/data/footprint/`

详细步骤见 **[deploy/README.md](deploy/README.md)**。

### 快速清单

1. GitHub 仓库配置 `production` environment（Secrets 与 bf-kitchen 相同：`ECS_*`、`FEISHU_APP_SECRET`）
2. ECS 首次：`sudo mkdir -p /opt/footprint-deploy`，等 CI 同步后 `cp deploy/.env.ecs.example deploy/.env.ecs` 并编辑
3. `sudo bash scripts/install-ecs.sh`
4. 宿主机 Nginx 反代 `127.0.0.1:3000`（示例域名 `footprint.houmq.cn`）
5. 小程序后台配置 request / uploadFile 合法域名

### 本地上传 env 到 ECS

```bash
cp deploy/.env.ecs.example deploy/.env.ecs
# 填写 WX_APPID、WX_SECRET、PUBLIC_BASE_URL 等
bash scripts/push-env-ecs.sh
```

## 功能

- 地图标点、地点搜索、足迹打卡、照片上传
- 时间线、日历、统计、历史补录、删除记录
- 微信登录 + 开发模式登录

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/auth/wx-login` | 微信登录 |
| POST | `/v1/auth/dev-login` | 开发登录 |
| GET | `/v1/locations/search` | 地点搜索 |
| POST | `/v1/checkins` | 创建打卡 |
| GET | `/v1/checkins/calendar` | 日历摘要 |
| GET | `/v1/map/markers` | 地图标点 |
| GET | `/v1/stats/summary` | 统计 |
| POST | `/v1/upload/presign` | 上传凭证 |

## 同机端口

| 项目 | 端口 | 部署目录 |
|------|------|----------|
| bf-kitchen | 8000 | `/opt/bf-kitchen-deploy` |
| footprint | 3000 | `/opt/footprint-deploy` |
