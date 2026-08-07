# @nav/ai-core

AI 服务协议抽象层，支持 OpenAI 兼容协议和 Claude 兼容协议。

## 架构

```
src/
├── types.ts                    # 类型定义
├── crypto.ts                   # AES-256-GCM 加密
├── registry.ts                 # Provider 注册表
├── rate-limiter.ts             # 速率限制
├── usage-tracker.ts            # 用量统计
├── index.ts                    # 入口
└── provider/
    ├── interface.ts            # 抽象接口
    ├── openai-compatible.ts    # OpenAI 兼容协议基类
    ├── openai.ts               # OpenAI 兼容协议
    └── claude.ts               # Claude 兼容协议
```

### 类继承关系

```
BaseAIProvider (抽象基类)
├── OpenAICompatibleProvider (OpenAI 兼容协议)
│   └── OpenAIProvider
└── ClaudeProvider (Claude Messages 协议)
```

## 快速开始

### 1. 安装

```bash
pnpm add @nav/ai-core
```

### 2. 基本使用

```typescript
import { OpenAIProvider } from '@nav/ai-core'

const provider = new OpenAIProvider()
provider.initialize({
  apiKey: 'sk-xxx',
  baseUrl: 'https://api.openai.com/v1', // 可选
  model: 'gpt-4o-mini' // 必填：请填写供应商实际支持的模型名称
})

// 生成网站描述
const result = await provider.generateDescription(
  '百度',
  'https://baidu.com',
  '页面内容摘要', // 可选
  { lang: 'zh', maxLength: 100 }
)
console.log(result.description)
```

### 3. 流式对话

```typescript
const messages = [
  { role: 'system', content: '你是一个助手' },
  { role: 'user', content: '你好' }
]

for await (const chunk of provider.chat(messages)) {
  process.stdout.write(chunk)
}
```

### 4. 完整对话

```typescript
const { content, meta } = await provider.chatComplete(messages)
console.log(content)
console.log(`Tokens: ${meta.totalTokens}`)
```

## API 密钥加密

```typescript
import { encrypt, decrypt } from '@nav/ai-core'

// 加密存储
const encrypted = encrypt('sk-xxx', process.env.JWT_SECRET)

// 解密使用
const apiKey = decrypt(encrypted, process.env.JWT_SECRET)
```

## 速率限制

```typescript
import { checkRateLimit, consumeRateLimit } from '@nav/ai-core'

const result = checkRateLimit(userId)
if (!result.allowed) {
  throw new Error('已达每日限额')
}

// 调用 AI 后消费配额
consumeRateLimit(userId)
```

## 配置 OpenAI 兼容服务

```typescript
const provider = new OpenAIProvider()
provider.initialize({
  apiKey: 'sk-xxx',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat'
})
```

## 模型配置

| 协议   | 默认地址                     | 模型要求                         |
| ------ | ---------------------------- | -------------------------------- |
| OpenAI | https://api.openai.com/v1    | 必须填写供应商实际支持的模型名称 |
| Claude | https://api.anthropic.com/v1 | 必须填写供应商实际支持的模型名称 |

## 特性

- ✅ OpenAI / Claude 双协议统一接口
- ✅ AES-256-GCM API 密钥加密
- ✅ 30 秒请求超时
- ✅ 流式响应支持
- ✅ 多格式响应兼容
- ✅ 内置速率限制
- ✅ 用量统计
