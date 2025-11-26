# RFC: Monorepo 架构升级与服务化演进方案

| 属性          | 内容                                              |
| :------------ | :------------------------------------------------ |
| **Author**    | 白岚 (Bai Lan)                                    |
| **Status**    | Draft                                             |
| **Created**   | 2025-11-26                                        |
| **Reviewers** | Frontend Team, Backend Team                       |
| **Scope**     | `apps/icon-api`, `packages/icon-core`, `apps/web` |

---

## 1. 摘要 (Executive Summary)

本项目旨在将当前的单体前端 + 简单 Node 服务架构，升级为**标准化的 Monorepo 服务化架构**。核心变更是将 `apps/icon-api` 升级为通用后端服务 `apps/api`，引入 Fastify 框架，并通过 `packages/contracts` 和 `packages/config` 实现前后端契约共享与配置治理。

预期收益：

- **可维护性**：核心领域逻辑 (`icon-core`) 纯函数化，测试覆盖率可提升至 80%+。
- **扩展性**：支持多模块 (Icon, Backup, Auth) 并行开发，互不干扰。
- **协作效率**：前后端通过 DTO 共享类型，减少接口联调成本与运行时错误。

---

## 2. 背景与动机 (Context & Motivation)

### 2.1 现状痛点

1.  **工程边界模糊**：`icon-core` 内部直接读取 `process.env`，导致单元测试困难，且无法复用于不同环境（如 Worker）。
2.  **服务治理缺失**：`icon-api` 基于 Node 原生 `http` 模块，缺乏路由管理、参数校验、结构化日志、限流与健康检查，难以支撑生产级流量。
3.  **契约隐式依赖**：前端 `AddSiteModal` 直接调用接口，缺乏类型约束，后端字段变更易导致前端崩溃。
4.  **业务扩展受限**：新增“数据备份”需求时，现有架构无法优雅地集成新业务模块。

### 2.2 业务目标

- 支撑后续 **数据备份/恢复** 功能的后端接口开发。
- 建立统一的 **鉴权与流控** 机制，保护 API 资源。

---

## 3. 技术方案 (Technical Design)

### 3.1 总体架构 (System Architecture)

```mermaid
graph TD
    subgraph "Apps Layer"
        Web[apps/web<br/>Vue3 + Vite]
        API[apps/api<br/>Fastify Service]
        Worker[apps/worker<br/>Async Jobs (Deferred)]
    end

    subgraph "Packages Layer"
        Config[packages/config<br/>Env Validation]
        IconCore[packages/icon-core<br/>Domain Logic]
        UI[packages/ui<br/>Design System]
        Shared[packages/shared<br/>Utils]
    end

    Web --> UI
    API --> Config
    API --> IconCore
    API --> Shared
    Worker --> IconCore
    Worker --> Config

    IconCore -.->|Inject| Config
```

### 3.2 目录结构规范

```text
root/
├── apps/
│   ├── web/                # 前端应用
│   ├── api/                # [Rename] 通用后端服务 (原 icon-api)
│   │   ├── src/
│   │   │   ├── modules/    # 业务模块 (icon, backup, auth)
│   │   │   ├── plugins/    # 基础设施 (logger, cors, rate-limit)
│   │   │   └── server.ts   # 入口
│   └── worker/             # [Deferred] 异步任务服务 (暂缓)
├── packages/
│   ├── config/             # [New] 配置治理 (Zod Schema)
│   ├── icon-core/          # [Refactor] 纯领域核心
│   └── ui/                 # [New] UI 组件库
```

### 3.3 关键技术选型 (Trade-off Analysis)

#### 服务框架：Fastify vs NestJS

| 维度         | Fastify (Selected)                | NestJS                             | 决策理由                                       |
| :----------- | :-------------------------------- | :--------------------------------- | :--------------------------------------------- |
| **复杂度**   | 低，轻量级                        | 高，概念多 (Module, DI, Decorator) | 当前业务规模较小，Fastify 足够灵活且性能更好。 |
| **性能**     | 极高 (Schema based serialization) | 较高 (基于 Express/Fastify)        | 追求低资源占用与高吞吐。                       |
| **类型支持** | 优秀 (TypeBox/Zod 配合)           | 优秀 (TS 原生支持)                 | 均满足需求。                                   |
| **生态**     | 插件丰富                          | 框架大一统                         | Fastify 插件生态足够覆盖需求。                 |

#### 配置管理：Zod + Dotenv

使用 `zod` 对环境变量进行运行时校验，确保应用启动时配置完备。相比纯 `dotenv`，增加了类型安全和防御性。

---

## 4. 详细设计 (Detailed Design)

### 4.1 接口契约设计 (`packages/icon-core/types.ts`)

采用 **Code-First** 模式，通过 TypeScript Interface 定义 DTO，并在 `packages/icon-core` 中导出。

```typescript
// 请求 DTO
export interface GetIconRequest {
  domain: string
}

// 响应 DTO
export interface GetIconResponse {
  url: string
  source: 'google' | 'duckduckgo' | 'clearbit' | 'default'
  processedAt?: string
}
```

### 4.2 配置注入与去副作用 (`apps/api` -> `packages/icon-core`)

`icon-core` 将不再读取 `process.env`，改为依赖注入。

```typescript
// packages/icon-core/iconService.ts
export type IconServiceOptions = {
  storage: StorageAdapter
  defaultIconUrl: string
}

export async function getIconUrl(domain: string, opts: IconServiceOptions) {
  // ... 纯业务逻辑
}

// apps/api/src/modules/icon/service.ts
import { config } from '@packages/config'
import { getIconUrl } from '@packages/icon-core'

// 在服务层组装依赖
const result = await getIconUrl(domain, {
  storage: createStorage(config), // 工厂方法
  defaultIconUrl: config.DEFAULT_ICON_URL
})
```

### 4.3 可观测性 (Observability)

- **Logging**: 使用 `pino`，全链路携带 `reqId` (Trace ID)。
- **Metrics**: 记录 API 响应时间、状态码分布。
- **Health Checks**:
  - `/healthz`: Liveness probe (进程存活)。
  - `/readyz`: Readiness probe (数据库/存储连接正常)。

---

## 5. 实施计划 (Execution Plan)

### Phase 1: Foundation (Week 1)

- [x] **Refactor**: 重命名 `apps/icon-api` -> `apps/api`。
- [ ] **Fix**: 修正根目录 `lint-staged` 配置，覆盖全路径。
- [x] **Feat**: 创建 `packages/config`。
- [x] **Optim**: 移除 `packages/contracts`，将契约类型合并至 `packages/icon-core` (避免过度拆分)。
- [x] **Refactor**: `icon-core` 去除环境变量依赖，改为参数注入。

### Phase 2: Migration (Week 2)

- [x] **Feat**: `apps/api` 引入 Fastify，实现基础骨架 (Logger, CORS)。
- [x] **Migrate**: 迁移 `GetIcon` 接口逻辑，接入 Zod 校验。
- [x] **Feat**: 实现 `/healthz` 和 `/readyz`。
- [ ] **Test**: 编写 API 集成测试。

### Phase 3: Alignment (Week 3)

- [x] **Refactor**: 前端 `apps/web` 接入 `packages/icon-core` 类型 (原 contracts)。
- [x] **Feat**: 封装统一的 `ApiClient`。
- [x] **Doc**: 输出 API 使用文档。

---

## 6. 风险与回滚 (Risks & Rollback)

| 风险点             | 应对策略                                                             | 回滚方案                                                         |
| :----------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **API 兼容性破坏** | 保持 URL 路径不变 (`/api/icon`)，参数通过 Zod 宽松校验兼容旧版。     | 保留 `apps/icon-api` 旧代码分支，通过 Nginx/网关切回旧服务端口。 |
| **依赖冲突**       | 使用 `pnpm` 严格管理依赖版本，CI 增加依赖检查环节。                  | 锁死 `pnpm-lock.yaml`，回退 commit。                             |
| **性能退化**       | 上线前进行基准测试 (Benchmark)，对比原声 Node http 与 Fastify 性能。 | 调整 Fastify 配置或优化序列化逻辑。                              |

---

## 7. 验收标准 (Definition of Done)

1.  **CI 通过**：所有包的 Lint, Typecheck, Test, Build 均在 GitHub Actions 通过。
2.  **边界清晰**：`packages/icon-core` 代码中无 `process.env` 引用。
3.  **接口可用**：`GET /api/icon` 正常响应，且包含标准错误码结构。
4.  **契约共享**：前端代码中成功引用 `GetIconRequest` 类型。
