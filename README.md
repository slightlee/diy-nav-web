# DIY NAV WEB

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-black?logo=fastify)](https://fastify.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Online](https://img.shields.io/badge/在线体验-1ddh.cn-5b82e5)](https://1ddh.cn)

> 一个本地优先、支持云同步与 AI 批量整理的个人导航管理平台。

[在线体验](https://1ddh.cn) · [快速开始](#快速开始) · [部署](#docker-部署)

## 项目简介

DIY NAV WEB 用于集中管理网站、分类和标签。未登录时数据保存在当前浏览器；登录后可以开启跨设备同步、创建历史备份，并在数据冲突或云端快照异常时进行恢复。

项目采用 pnpm + Turborepo Monorepo：Web 端基于 Vue 3，API 基于 Fastify，结构化数据支持 Cloudflare D1 或 MySQL；对象存储支持 Cloudflare R2、S3 兼容服务和 WebDAV。AI 能力支持用户配置多个 OpenAI 或 Claude 协议服务。

## 核心功能

| 能力            | 说明                                                                                        |
| :-------------- | :------------------------------------------------------------------------------------------ |
| 导航管理        | 网站增删改查、常用与最近使用、拖拽排序、访问统计。                                          |
| 搜索与筛选      | 根据名称、描述、分类和标签实时检索，支持组合筛选。                                          |
| 分类与标签      | 独立管理分类和标签，并在网站卡片中展示整理结果。                                            |
| 响应式界面      | 桌面端与移动端布局，支持浅色、深色和跟随系统主题。                                          |
| 账号与同步      | 邮箱注册登录，支持 GitHub、Google、Linux.do OAuth 与登录方式绑定。                          |
| 管理后台        | 管理用户权限、站点与邮件、第三方登录和对象存储配置。                                        |
| 备份与迁移      | 自动/手动备份、历史恢复、JSON 导入导出、备份数量与内容统计。                                |
| AI 助手         | 通过对话管理网站、分类、标签和备份，自动生成描述并完成归类。                                |
| Chrome 书签整理 | 导入 `bookmarks.html`，统一规划分类标签，分批生成描述、归类并获取网站图标，支持暂停后继续。 |
| 多 AI 服务      | 配置多个 OpenAI/Claude 协议服务，获取模型、测试连接并设置默认服务。                         |

## 最新界面

以下截图来自当前本地代码和测试数据，桌面端尺寸为 1440 × 892。

### 核心页面

|             首页             |               全部网站                |
| :--------------------------: | :-----------------------------------: |
| ![首页](doc/images/home.png) | ![全部网站](doc/images/all-sites.png) |

### 登录、备份与移动端

|             登录              |               注册               |
| :---------------------------: | :------------------------------: |
| ![登录](doc/images/login.png) | ![注册](doc/images/register.png) |

|              备份               |                              移动端首页                              |                                移动端全部网站                                 |
| :-----------------------------: | :------------------------------------------------------------------: | :---------------------------------------------------------------------------: |
| ![备份](doc/images/backups.png) | <img src="doc/images/home-phone.png" alt="移动端首页" width="390" /> | <img src="doc/images/all-sites-phone.png" alt="移动端全部网站" width="390" /> |

### AI 助手

|             AI 助手             |        AI 助手：添加网站         |
| :-----------------------------: | :------------------------------: |
| ![AI 助手](doc/images/ai-1.png) | ![添加网站](doc/images/ai-2.png) |

|         AI 助手：添加标签          |        AI 助手：备份数据         |        AI 助手：查看备份数据         |
| :--------------------------------: | :------------------------------: | :----------------------------------: |
| ![添加标签](doc/images/ai-2-1.png) | ![备份数据](doc/images/ai-3.png) | ![查看备份数据](doc/images/ai-4.png) |

## 技术栈

| 层级     | 技术                                                           |
| :------- | :------------------------------------------------------------- |
| Web      | Vue 3.5、TypeScript、Vite 6、Pinia 3、Vue Router、SCSS         |
| API      | Node.js 20+、Fastify 5、Zod、JWT                               |
| AI       | OpenAI Compatible API、Claude API、多 Provider 注册与调用      |
| 数据库   | Cloudflare D1、MySQL                                           |
| 对象存储 | Cloudflare R2、WebDAV、本地存储                                |
| 工程化   | pnpm Workspace、Turborepo、ESLint、Stylelint、Prettier、Vitest |
| 部署     | Docker、Docker Compose、Nginx                                  |

## 项目结构

```text
.
├── apps
│   ├── web                 # Vue Web 应用
│   └── api                 # Fastify API 服务
├── packages
│   ├── ai-core             # AI 协议、Provider 与结构化输出
│   ├── auth-providers      # GitHub、Google、Linux.do OAuth
│   ├── config              # 环境配置
│   ├── core                # 认证、同步、备份等领域服务
│   ├── database            # Cloudflare D1 / MySQL 数据库适配
│   ├── icon-core           # 网站图标获取
│   ├── storage             # R2、WebDAV、本地存储
│   ├── types               # 共享类型
│   └── ui                  # 共享 UI 组件
├── deploy                  # Docker Compose 与部署脚本
├── doc/images              # README 截图
└── README.md
```

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- pnpm 8 或更高版本
- Cloudflare D1 或 MySQL 数据库
- Docker 与 Docker Compose（仅 Docker 部署需要）

### 安装依赖

```bash
git clone https://github.com/slightlee/diy-nav-web.git
cd diy-nav-web
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
```

完整配置和注释以 [`.env.example`](.env.example) 为准。至少需要根据部署方式检查以下配置：

| 分组     | 关键变量                                                                                                                 | 说明                                                    |
| :------- | :----------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| 应用     | `NODE_ENV`、`APP_PORT`                                                                                                   | API 运行模式和端口。                                    |
| 数据库   | `DB_PROVIDER`                                                                                                            | `d1`（默认）或 `mysql`。                                |
| D1       | `CLOUDFLARE_ACCOUNT_ID`、`DB_D1_API_TOKEN`、`DB_D1_DATABASE_ID`                                                          | `DB_PROVIDER=d1` 时必填。                               |
| MySQL    | `DB_MYSQL_HOST`、`DB_MYSQL_PORT`、`DB_MYSQL_USER`、`DB_MYSQL_PASSWORD`、`DB_MYSQL_DATABASE`、`DB_MYSQL_CONNECTION_LIMIT` | `DB_PROVIDER=mysql` 时配置，建议使用 `utf8mb4` 字符集。 |
| 安全密钥 | `JWT_SECRET`、`OAUTH_CONFIG_ENCRYPTION_KEY`                                                                              | 生产环境必须使用强随机值，加密密钥长度至少 32 位。      |
| 图标     | `ICON_SIZE`、`ICON_DEFAULT_URL`、`ICON_GOOGLE_PROXY_URL`                                                                 | 图标尺寸、默认图标和 Favicon 服务地址。                 |
| 日志     | `LOG_LEVEL`、`LOG_HEADERS`                                                                                               | 日志级别以及是否记录请求头。                            |
| 前端     | `VITE_API_BASE_URL`、`VITE_BASE`、`VITE_USE_HASH_ROUTER`、`VITE_AUTO_BACKUP_INTERVAL`                                    | 构建时写入的 API 地址、部署路径、路由和自动备份间隔。   |

站点、SMTP、OAuth 和对象存储配置由管理后台写入数据库，不再通过环境变量维护。不要提交真实 Token、Secret、API Key 或 WebDAV 密码；后台保存的敏感值会使用 `OAUTH_CONFIG_ENCRYPTION_KEY` 加密。

#### 从 D1 迁移到 MySQL

迁移前让 `.env` 同时保留有效的 D1 与 MySQL 配置，并设置 `DB_PROVIDER=mysql`。然后在项目根目录执行：

```bash
pnpm --filter api migrate:d1-to-mysql
```

迁移脚本会在 MySQL 中初始化表结构、幂等写入 D1 数据并校验各表行数。备份和同步快照的文件本体仍保存在对象存储中，不会由该脚本搬迁。需要回滚时，将 `DB_PROVIDER` 改回 `d1` 并重启服务即可。

### 管理后台

管理员登录后可通过 `/admin` 进入管理后台。

| 模块       | 能力                                                                 |
| :--------- | :------------------------------------------------------------------- |
| 系统概览   | 查看用户数量、OAuth 与存储状态、运行环境、数据库类型和服务运行时间。 |
| 用户与权限 | 搜索用户，调整 `USER` / `ADMIN` 角色以及启用、停用账号。             |
| 站点与邮件 | 设置站点名称、Logo、外部访问地址、注册开关和 SMTP 邮件服务。         |
| 第三方登录 | 配置并启用 GitHub、Google、Linux.do OAuth。                          |
| 对象存储   | 分别配置公开资源与备份存储，支持 R2、S3 兼容服务和 WebDAV 连接测试。 |

#### 初始化首个管理员

新注册用户默认角色为 `USER`。首次部署后，先注册管理员账号，再通过 D1 控制台或 MySQL 客户端执行：

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

重新登录后即可进入管理后台。系统会阻止降级或停用最后一个有效管理员。

### 启动开发环境

```bash
# 同时启动 Web、API 和内部包的开发任务
pnpm dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8787](http://localhost:8787)
- 健康检查: [http://localhost:8787/healthz](http://localhost:8787/healthz)

也可以分别启动：

```bash
pnpm dev:web
pnpm dev:api
```

## 数据与同步

- 浏览器数据采用本地优先策略，未登录也可以管理导航。
- 开启云同步后，网站、分类和标签会在同一账号的设备间同步。
- 写入同步快照前会校验版本，避免静默覆盖其他设备上的更新。
- 自动备份和手动备份均可在历史列表中恢复或删除。
- JSON 导入只覆盖文件中包含的对应数据；执行覆盖操作前请先创建备份。
- 主题、默认首页等偏好与导航数据分开管理。

## 质量检查

```bash
pnpm type-check
pnpm lint
pnpm stylelint
pnpm test
pnpm build
```

提交前可执行完整校验：

```bash
pnpm ci:verify
```

## Docker 部署

### 使用 D1

```bash
cp .env.example .env
# 修改 .env 中的生产配置
sh deploy/deploy.sh
```

脚本会使用当前 Git Tag；没有 Tag 时使用当前 Commit SHA 构建并启动 `nav-web` 与 `nav-api` 容器。

### 使用 MySQL 容器

当 MySQL 由另一个 Compose 项目管理时，确保其容器名或网络别名为 `mysql`，并且已经加入 `mysql_default` 网络：

```bash
docker network inspect mysql_default
```

如果现有 MySQL 网络不是 `mysql_default`，请同步修改 `deploy/docker-compose.mysql.yml` 中的外部网络名称。

MySQL 专用配置是基础 Compose 的增量覆盖文件。手动部署时同时加载两份配置：

```bash
docker compose \
  --env-file .env \
  -f deploy/docker-compose.yml \
  -f deploy/docker-compose.mysql.yml \
  up --build -d
```

`deploy/remote-deploy.sh` 会读取 `.env` 中的 `DB_PROVIDER`：使用 `mysql` 时自动加载 `docker-compose.mysql.yml`，使用 `d1` 时只加载基础 Compose。运行远程脚本前，需要先在脚本配置区设置 SSH 用户、密钥路径和部署目录，并通过 shell 环境变量提供 SSH 服务器地址：

```bash
DB_HOST=服务器地址 sh deploy/remote-deploy.sh
```

这里的 `DB_HOST` 仅用于定位部署服务器；数据库连接仍由 `.env` 中的 `DB_PROVIDER` 和对应数据库变量控制。

- Web: `http://localhost:3000`
- API: `http://localhost:8787`

## 贡献

1. Fork 本仓库。
2. 创建功能分支：`git checkout -b feat/example`。
3. 完成修改并执行质量检查。
4. 按 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交。
5. 推送分支并创建 Pull Request。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=slightlee/diy-nav-web&type=Date)](https://star-history.com/#slightlee/diy-nav-web&Date)

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
