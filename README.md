# DIY 导航 Web (diy-nav-web)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.0-green)](https://vuejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-black)](https://www.fastify.io/)

轻量、可自定义的个人导航网站管理工具。支持网站添加、分类与标签管理、搜索筛选，以及数据导入/导出、自动备份，专注个人与团队的导航资源整理。

## 🏗 架构设计 (Architecture)

本项目采用 **Monorepo** 架构，基于 `pnpm workspace` 管理。

```mermaid
graph TD
    User[用户 (Browser)] --> Web[前端应用 (apps/web)]
    Web -->|HTTP/REST| API[后端服务 (apps/api)]

    subgraph "Backend Layer"
        API --> Core[核心业务逻辑 (@nav/core)]
        Core --> DB_Client[数据库客户端 (@nav/database)]
        Core --> Storage_Client[存储客户端 (@nav/storage)]
        Core --> Config[配置管理 (@nav/config)]
    end

    subgraph "Infrastructure (Cloudflare)"
        DB_Client --> D1[(Cloudflare D1 SQL)]
        Storage_Client --> R2[(Cloudflare R2 Object Storage)]
    end
```

### 核心模块

- **apps/web**: 基于 Vue 3 + Vite + Pinia 的前端应用。
- **apps/api**: 基于 Fastify 的后端 API 服务，运行在 Node.js 环境中，通过 HTTP API 连接 Cloudflare D1/R2。
- **packages/core**: 核心业务逻辑（Auth, Backup, Logger 等）。
- **packages/database**: D1 数据库客户端封装 (HTTP API)。
- **packages/storage**: R2 对象存储客户端封装 (S3 Compatible)。
- **packages/config**: 统一配置管理。

## ✨ 功能特性 (Features)

- **网站管理**: 便捷添加、编辑、删除网站链接。
- **分类与标签**: 灵活的分类和多标签系统，支持拖拽排序。
- **智能搜索**: 支持按名称、描述、标签和分类进行实时搜索。
- **数据安全**:
  - **自动备份**: 定时自动备份数据到云端 (R2)。
  - **手动备份**: 支持手动创建备份快照。
  - **数据恢复**: 随时从备份中恢复数据。
- **多端适配**: 完美适配桌面端和移动端，提供流畅的响应式体验。
- **图标获取**: 自动抓取网站 Favicon，支持多种图标源。

## 🔧 环境变量 (Environment Variables)

复制 `.env.example` 到 `.env` 并配置以下变量：

| 变量名                         | 说明                    | 默认值/示例            |
| :----------------------------- | :---------------------- | :--------------------- |
| `NODE_ENV`                     | 环境模式                | `development`          |
| `APP_PORT`                     | API 服务端口            | `8787`                 |
| `STORAGE_PROVIDER`             | 存储提供商              | `local` / `cloudflare` |
| `DB_D1_DATABASE_ID`            | Cloudflare D1 数据库 ID | -                      |
| `DB_D1_API_TOKEN`              | Cloudflare API Token    | -                      |
| `STORAGE_R2_ACCOUNT_ID`        | Cloudflare R2 账户 ID   | -                      |
| `STORAGE_R2_ACCESS_KEY_ID`     | R2 Access Key ID        | -                      |
| `STORAGE_R2_SECRET_ACCESS_KEY` | R2 Secret Access Key    | -                      |

## 🚀 技术栈 (Tech Stack)

- **前端**: Vue 3, TypeScript, Vite, Pinia, SCSS
- **后端**: Node.js, Fastify, Zod (Validation)
- **基础设施**: Cloudflare D1 (SQLite), Cloudflare R2 (S3-compatible)
- **工具链**: pnpm (Monorepo), ESLint, Prettier, Vitest

## 🛠 开发指南 (Development Guide)

### 前置要求 (Prerequisites)

- Node.js >= 18
- pnpm >= 8

### 安装依赖 (Installation)

```bash
# 在根目录运行
pnpm install
```

### 本地开发 (Local Development)

同时启动前端和后端服务：

```bash
pnpm dev
```

或者分别启动：

```bash
# 启动前端 (http://localhost:3000)
pnpm -C apps/web dev

# 启动后端 (http://localhost:8787)
pnpm -C apps/api dev
```

### 构建 (Build)

构建所有包和应用：

```bash
pnpm build
```

### 测试 (Testing)

运行单元测试：

```bash
pnpm test
```

## 🚢 部署 (Deployment)

### 部署后端 (API)

推荐使用 Docker 或 PM2 进行部署。

**Docker 部署**:

```bash
# 构建镜像
docker build -t diy-nav-api ./apps/api

# 运行容器
docker run -d -p 8787:8787 --env-file .env diy-nav-api
```

**PM2 部署**:

```bash
# 构建
pnpm -C apps/api build

# 启动
pm2 start apps/api/dist/server.js --name diy-nav-api
```

### 部署前端 (Web)

```bash
# 构建前端
pnpm -C apps/web build

# 部署到 Cloudflare Pages / Vercel / Nginx
# 构建产物位于 apps/web/dist
```

## 📂 项目结构 (Project Structure)

```
.
├── apps
│   ├── api          # 后端 API 服务
│   └── web          # 前端 Vue 应用
├── packages
│   ├── config       # 共享配置
│   ├── core         # 核心业务逻辑
│   ├── database     # 数据库客户端
│   ├── storage      # 存储客户端
│   └── ui           # (可选) 共享 UI 组件
├── package.json     # Root package.json
├── pnpm-workspace.yaml
└── turbo.json       # TurboRepo 配置 (可选)
```

## 🤝 贡献 (Contribution)

1.  Fork 本仓库
2.  创建特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交 Pull Request

## 📄 许可证 (License)

Distributed under the MIT License. See `LICENSE` for more information.
