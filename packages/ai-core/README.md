# @nav/ai-core

多 AI 服务提供商抽象层，支持 OpenAI、Claude、Qwen、ERNIE 等主流模型。

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
    ├── openai.ts               # OpenAI
    ├── qwen.ts                 # 通义千问
    ├── custom.ts               # 自定义 (OpenAI 兼容)
    ├── claude.ts               # Claude (Anthropic)
    └── ernie.ts                # 文心一言 (百度)
```

### 类继承关系

```
BaseAIProvider (抽象基类)
├── OpenAICompatibleProvider (OpenAI 兼容协议)
│   ├── OpenAIProvider
│   ├── QwenProvider
│   └── CustomProvider
├── ClaudeProvider (Anthropic 协议)
└── ERNIEProvider (百度协议)
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
  model: 'gpt-4o-mini' // 可选
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

## 新增 OpenAI 兼容厂商

```typescript
import { OpenAICompatibleProvider } from '@nav/ai-core'
import { PROVIDER_PRESETS } from '@nav/ai-core'

export class DeepSeekProvider extends OpenAICompatibleProvider {
  readonly name = 'deepseek'
  readonly displayName = 'DeepSeek'

  constructor() {
    super()
    this._baseUrl = 'https://api.deepseek.com/v1'
    this._model = 'deepseek-chat'
  }
}
```

## 支持的模型

| Provider | 默认模型                   | 协议      |
| -------- | -------------------------- | --------- |
| OpenAI   | gpt-4o                     | OpenAI    |
| Qwen     | qwen-max                   | OpenAI    |
| Claude   | claude-3-5-sonnet-20241022 | Anthropic |
| ERNIE    | ernie-speed-128k           | 百度      |
| Custom   | 用户配置                   | OpenAI    |

## 特性

- ✅ 多提供商统一接口
- ✅ AES-256-GCM API 密钥加密
- ✅ 30 秒请求超时
- ✅ 流式响应支持
- ✅ 多格式响应兼容
- ✅ 内置速率限制
- ✅ 用量统计
