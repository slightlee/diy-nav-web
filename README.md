# DIY NAV WEB (diy-nav-web)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.0-green)](https://vuejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.0-black)](https://www.fastify.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Demo](https://img.shields.io/badge/Demo-Online-orange)](https://demo-nav.fpic.top)

> **轻量、极速、可定制的现代化个人导航管理平台。**
>
> _A lightweight, fast, and customizable modern personal navigation management platform._
>
> 🔗 **在线演示**: [https://demo-nav.fpic.top](https://demo-nav.fpic.top)（完整功能体验，未配置 API 服务故登录和云备份不可用）

---

## 📖 简介 (Introduction)

**DIY NAV WEB** 是一个专为追求极致体验的开发者和团队设计的导航管理工具。它不仅仅是一个书签管理器，更是一个高性能、可扩展的资源中心。

采用 **Monorepo** 架构，前端基于 **Vue 3 + Vite**，后端采用 **Fastify**，底层数据存储无缝集成 **Cloudflare D1 & R2**，为您提供企业级的性能与安全性。

## ✨ 核心特性 (Features)

| 特性             | 说明                                                       |
| :--------------- | :--------------------------------------------------------- |
| ⚡️ **极致性能** | 基于 Vite 构建，秒级启动；Fastify 后端，高并发处理能力。   |
| 🎨 **精美 UI**   | 现代化卡片式设计，响应式布局，完美适配桌面与移动端。       |
| 🔐 **数据安全**  | 支持 **Cloudflare R2** 自动与手动云备份，数据永不丢失。    |
| 🔍 **智能检索**  | 支持按名称、描述、分类、标签进行毫秒级实时搜索。           |
| 🏷 **灵活分类**  | 强大的多标签与分类系统，支持拖拽排序，管理井井有条。       |
| ☁️ **云原生**    | 原生支持 Cloudflare D1 (SQL) 和 R2 (Object Storage) 部署。 |

## 📸 预览 (Screenshots)

### 核心页面 (Core)

|               首页               |                  全部                  |
| :------------------------------: | :------------------------------------: |
| ![首页概览](doc/images/home.png) | ![All Sites](doc/images/all-sites.png) |

### 更多截图 (More)

|            登录页面            |               注册页面               |
| :----------------------------: | :----------------------------------: |
| ![Login](doc/images/login.png) | ![Register](doc/images/register.png) |

|               备份               |            首页（移动端）             |               全部（移动端）               |
| :------------------------------: | :-----------------------------------: | :----------------------------------------: |
| ![Login](doc/images/backups.png) | ![Backups](doc/images/home-phone.png) | ![Backups](doc/images/all-sites-phone.png) |

## 🛠 技术栈 (Tech Stack)

本项目采用现代化的全栈技术架构：

- **Frontend**: [Vue 3](https://vuejs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Pinia](https://pinia.vuejs.org/), [SCSS](https://sass-lang.com/)
- **Backend**: [Node.js](https://nodejs.org/), [Fastify](https://www.fastify.io/), [Zod](https://zod.dev/)
- **Infrastructure**: [Cloudflare D1](https://developers.cloudflare.com/d1/), [Cloudflare R2](https://developers.cloudflare.com/r2/)
- **Tooling**: [pnpm](https://pnpm.io/) (Monorepo), [TurboRepo](https://turbo.build/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

## 🚀 快速开始 (Getting Started)

### 前置要求 (Prerequisites)

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0

### 安装 (Installation)

```bash
# 克隆仓库
git clone https://github.com/slightlee/diy-nav-web.git

# 进入目录
cd diy-nav-web

# 安装依赖
pnpm install
```

### 开发 (Development)

1.  **配置环境**

    复制环境变量示例文件（开发环境同样需要）：

    ```bash
    cp .env.example .env
    ```

    **环境变量配置说明：**

    请打开 `.env` 文件并根据下表修改关键配置。本项目依赖 Cloudflare D1 和 R2，请确保即使在本地开发时也填入正确的密钥（或使用本地模拟器）。

    | 变量名                         |  必填  | 说明                                                  |
    | :----------------------------- | :----: | :---------------------------------------------------- |
    | **基础配置**                   |        |                                                       |
    | `NODE_ENV`                     |   是   | 环境模式 (development/production)                     |
    | `APP_PORT`                     |   是   | API 服务端口，默认 `8787`                             |
    | **数据存储 (Cloudflare)**      |        |                                                       |
    | `DB_D1_API_TOKEN`              | **是** | Cloudflare API Token (需 D1 读写权限)                 |
    | `DB_D1_DATABASE_ID`            | **是** | D1 数据库 ID                                          |
    | `STORAGE_PROVIDER`             |   是   | 存储提供商，默认 `cloudflare`                         |
    | `STORAGE_BUCKET`               | **是** | R2 存储桶名称                                         |
    | `STORAGE_R2_ACCOUNT_ID`        | **是** | Cloudflare Account ID                                 |
    | `STORAGE_R2_ACCESS_KEY_ID`     | **是** | R2 Access Key                                         |
    | `STORAGE_R2_SECRET_ACCESS_KEY` | **是** | R2 Secret Key                                         |
    | `STORAGE_PUBLIC_BASE_URL`      | **是** | R2 绑定的公开访问域名 (例如 `https://r2.example.com`) |
    | **认证 (Auth)**                |        |                                                       |
    | `JWT_SECRET`                   | **是** | JWT 签名密钥 (生产环境必须 32 位以上)                 |
    | **第三方登录 (OAuth)**         |        |                                                       |
    | `VITE_LINUX_DO_CLIENT_ID`      |   否   | Linux Do 第三方登录 Client ID (前端可见)              |
    | `LINUX_DO_CLIENT_ID`           |   否   | Linux Do 第三方登录 Client ID (后端使用)              |
    | `LINUX_DO_CLIENT_SECRET`       |   否   | Linux Do 第三方登录 Secret (后端专用)                 |
    | `LINUX_DO_REDIRECT_URI`        |   否   | Linux Do OAuth 回调地址                               |

    > ⚠️ **注意**: `packages` 目录下的内部包构建依赖完整的环境配置，如果配置不完整可能会导致部分功能异常。

2.  **启动服务**

    本项目使用 `pnpm` workspace 管理，可一键启动全栈开发环境：

    ```bash
    # 同时启动 Web 和 API
    pnpm dev
    ```

3.  **访问应用**
    - **Web**: [http://localhost:3000](http://localhost:3000)
    - **API**: [http://localhost:8787](http://localhost:8787)

### 构建 (Build)

```bash
# 构建所有应用和包
pnpm build
```

## 🚢 部署 (Deployment)

### Docker 部署 (推荐)

本项目提供了一键部署脚本，基于 Docker Compose 快速拉起完整服务。

1.  **配置环境变量**

    复制示例配置文件并修改必要的配置（如端口、密钥等）：

    ```bash
    cp .env.example .env
    # vim .env
    ```

2.  **执行部署脚本**

    ```bash
    sh deploy/deploy.sh
    ```

    脚本会自动构建镜像并启动服务。
    - **Web**: `http://localhost:3000`
    - **API**: `http://localhost:8787`

## 🗺 路线图 (Roadmap)

### ✅ 已完成

- [x] 基础导航管理（增删改查、拖拽排序）
- [x] 分类与标签管理
- [x] 深色/浅色/自动主题切换
- [x] 数据导入/导出 (JSON)
- [x] Cloudflare R2 云端备份
- [x] 多用户系统（注册/登录）
- [x] 第三方登录（Linuxdo）

### 🚧 规划中

- [ ] 更多 OAuth 提供商（GitHub / Google）
- [ ] 快捷键支持
- [ ] 首页小组件（可拖拽自定义布局）

## 🤝 贡献指南 (Contributing)

欢迎社区贡献！如果您有通过 Pull Request 贡献代码的意愿，请遵循以下步骤：

1.  **Fork** 本仓库。
2.  创建一个新的特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交您的更改 (`git commit -m 'feat: Add some AmazingFeature'`)，请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。
4.  推送到分支 (`git push origin feature/AmazingFeature`)。
5.  开启一个 **Pull Request**。

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=slightlee/diy-nav-web&type=Date)](https://star-history.com/#slightlee/diy-nav-web&Date)

## 📄 许可证 (License)

本项目基于 [MIT 许可证](LICENSE) 开源。
