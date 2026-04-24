# Model Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let PawDesk users configure built-in or custom model providers and receive real chat replies through OpenAI-compatible or Anthropic-compatible HTTP APIs.

**Architecture:** Keep pet state, task state, and work mode local. Route chat generation through a small provider registry keyed by protocol, with `local-template` as default/fallback and native `fetch` adapters for `openai-chat` and `anthropic-messages`. Persist full secret-bearing config in Electron main process, but expose only secret-safe snapshots to renderer.

**Tech Stack:** Electron, React, TypeScript, native `fetch`, Node test runner, existing JSON persistence.

---

## File Structure

- Modify `src/shared/types/model-config.ts`: provider/protocol unions, config/snapshot types, preset metadata.
- Create `src/domain/chat/providers/presets.ts`: built-in provider definitions and helper lookups.
- Create `src/domain/chat/providers/types.ts`: shared adapter and reply option types.
- Create `src/domain/chat/providers/prompt.ts`: provider-neutral prompt construction from scenario/context/user text.
- Create `src/domain/chat/providers/openai-chat.ts`: OpenAI-compatible HTTP adapter.
- Create `src/domain/chat/providers/anthropic-messages.ts`: Anthropic Messages HTTP adapter.
- Create `src/domain/chat/providers/registry.ts`: protocol adapter registry.
- Modify `src/domain/chat/chat-service.ts`: route through registry and fallback safely.
- Modify `src/domain/chat/chat-service.test.ts`: routing/fallback/adapter tests.
- Create `src/domain/chat/providers/openai-chat.test.ts`: request/response parsing tests.
- Create `src/domain/chat/providers/anthropic-messages.test.ts`: request/response parsing tests.
- Modify `src/main/persistence/model-config-store.ts`: normalization, migration, key preservation/clearing.
- Create `src/main/persistence/model-config-store.test.ts`: config store normalization tests.
- Modify `src/main/pet/pet-session.ts`: use normalized saved config returned from store.
- Modify `src/renderer/src/panel/PanelApp.tsx`: provider selector and remote fields.
- Modify `src/renderer/src/pet/usePetSnapshot.ts`: browser fallback snapshot includes new protocol field.

## Task 1: Model config types and provider presets

**Files:**
- Modify: `src/shared/types/model-config.ts`
- Create: `src/domain/chat/providers/presets.ts`

- [ ] **Step 1: Replace model config types**

Use this shape in `src/shared/types/model-config.ts`:

```ts
export type ModelProtocol = 'local-template' | 'openai-chat' | 'anthropic-messages'

export type ModelProviderId =
  | 'local-template'
  | 'openai'
  | 'gemini'
  | 'minimax'
  | 'glm'
  | 'anthropic'
  | 'custom-openai'
  | 'custom-anthropic'

export type ModelMode = 'local-template' | 'claude' | 'remote'

export interface ModelConfig {
  enabled: boolean
  mode: ModelMode
  provider: ModelProviderId
  protocol: ModelProtocol
  model: string
  baseUrl: string
  apiKey: string
}

export interface ModelConfigSnapshot {
  enabled: boolean
  mode: ModelMode
  provider: ModelProviderId
  protocol: ModelProtocol
  model: string
  baseUrl: string
  hasApiKey: boolean
}

export interface ModelProviderPreset {
  id: ModelProviderId
  label: string
  protocol: ModelProtocol
  defaultModel: string
  defaultBaseUrl: string
  requiresApiKey: boolean
  editableBaseUrl: boolean
  custom: boolean
}
```

- [ ] **Step 2: Add preset definitions**

Create `src/domain/chat/providers/presets.ts`:

```ts
import type { ModelProviderId, ModelProviderPreset } from '../../../shared/types/model-config'

export const modelProviderPresets: ModelProviderPreset[] = [
  {
    id: 'local-template',
    label: '本地模板回复',
    protocol: 'local-template',
    defaultModel: 'template-v1',
    defaultBaseUrl: '',
    requiresApiKey: false,
    editableBaseUrl: false,
    custom: false
  },
  {
    id: 'openai',
    label: 'GPT / OpenAI',
    protocol: 'openai-chat',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'gemini',
    label: 'Gemini',
    protocol: 'openai-chat',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    protocol: 'openai-chat',
    defaultModel: 'MiniMax-M1',
    defaultBaseUrl: 'https://api.minimaxi.com/v1',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'glm',
    label: 'GLM / Z.ai',
    protocol: 'openai-chat',
    defaultModel: 'glm-4.5-flash',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    protocol: 'anthropic-messages',
    defaultModel: 'claude-opus-4-7',
    defaultBaseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'custom-openai',
    label: '自定义 OpenAI 兼容',
    protocol: 'openai-chat',
    defaultModel: '',
    defaultBaseUrl: '',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: true
  },
  {
    id: 'custom-anthropic',
    label: '自定义 Anthropic 兼容',
    protocol: 'anthropic-messages',
    defaultModel: '',
    defaultBaseUrl: '',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: true
  }
]

export function getModelProviderPreset(provider: ModelProviderId): ModelProviderPreset {
  return modelProviderPresets.find((preset) => preset.id === provider) ?? modelProviderPresets[0]
}
```

- [ ] **Step 3: Run typecheck and note expected failures**

Run: `pnpm typecheck`

Expected: FAIL because existing code still assumes provider/mode are only `local-template | claude` and snapshots do not include `protocol`.

## Task 2: Config normalization and persistence

**Files:**
- Modify: `src/main/persistence/model-config-store.ts`
- Create: `src/main/persistence/model-config-store.test.ts`

- [ ] **Step 1: Add tests for normalization and key behavior**

Create tests that import pure helpers from `model-config-store.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeModelConfig, mergeModelConfigForSave, toModelConfigSnapshot } from './model-config-store'

test('normalizes missing config to local template', () => {
  const config = normalizeModelConfig(null)
  assert.equal(config.provider, 'local-template')
  assert.equal(config.protocol, 'local-template')
  assert.equal(config.model, 'template-v1')
  assert.equal(config.apiKey, '')
})

test('migrates old claude config to anthropic messages', () => {
  const config = normalizeModelConfig({
    enabled: true,
    mode: 'claude',
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'secret'
  })
  assert.equal(config.provider, 'anthropic')
  assert.equal(config.protocol, 'anthropic-messages')
  assert.equal(config.apiKey, 'secret')
})

test('fills built-in provider defaults', () => {
  const config = normalizeModelConfig({ provider: 'gemini', apiKey: 'key' })
  assert.equal(config.protocol, 'openai-chat')
  assert.equal(config.model, 'gemini-2.0-flash')
  assert.equal(config.baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai')
})

test('preserves existing key when unchanged remote config submits empty key', () => {
  const current = normalizeModelConfig({ provider: 'openai', apiKey: 'saved-key' })
  const next = mergeModelConfigForSave(current, { ...current, apiKey: '' })
  assert.equal(next.apiKey, 'saved-key')
})

test('clearApiKey clears existing key', () => {
  const current = normalizeModelConfig({ provider: 'openai', apiKey: 'saved-key' })
  const next = mergeModelConfigForSave(current, { ...current, apiKey: '', clearApiKey: true })
  assert.equal(next.apiKey, '')
})

test('snapshot never exposes api key', () => {
  const snapshot = toModelConfigSnapshot(normalizeModelConfig({ provider: 'openai', apiKey: 'secret' }))
  assert.equal(snapshot.hasApiKey, true)
  assert.equal('apiKey' in snapshot, false)
})
```

- [ ] **Step 2: Export pure normalization helpers**

Update `model-config-store.ts` to export:

```ts
export interface ModelConfigSaveInput extends Partial<ModelConfig> {
  clearApiKey?: boolean
}

export function normalizeModelConfig(value: unknown): ModelConfig
export function mergeModelConfigForSave(current: ModelConfig, input: ModelConfigSaveInput): ModelConfig
```

Implementation rules:

- Accept unknown old JSON shape.
- Map `provider: 'claude'` or `mode: 'claude'` to provider `anthropic` and protocol `anthropic-messages`.
- For built-ins, fill missing model/base URL from preset.
- Trim `apiKey`, `model`, and `baseUrl`.
- Remove trailing slashes from base URL.
- Validate remote base URL with `new URL`; require `http:` or `https:`.
- Invalid custom provider base URL becomes local-template.
- Local-template always clears `apiKey`, `baseUrl`, and uses `template-v1`.

- [ ] **Step 3: Update load/save**

Make `loadModelConfig()` return `normalizeModelConfig(await readJsonFile(...))`.

Change `saveModelConfig` to accept `(current: ModelConfig, input: ModelConfigSaveInput): Promise<ModelConfig>`, compute `mergeModelConfigForSave(current, input)`, write it, and return it.

- [ ] **Step 4: Run tests**

Run: `node --test src/main/persistence/model-config-store.test.ts`

Expected: PASS.

## Task 3: Provider adapter interfaces and prompt builder

**Files:**
- Create: `src/domain/chat/providers/types.ts`
- Create: `src/domain/chat/providers/prompt.ts`

- [ ] **Step 1: Add adapter types**

Create:

```ts
import type { ModelConfig } from '../../../shared/types/model-config'
import type { ChatContext, ChatScenario } from '../types'

export type ProviderFetch = typeof fetch

export interface ProviderReplyOptions {
  scenario: ChatScenario
  context: ChatContext
  userText?: string
  config: ModelConfig
  fetchFn?: ProviderFetch
}

export interface ModelProviderAdapter {
  createReply(options: ProviderReplyOptions): Promise<string>
}
```

- [ ] **Step 2: Add prompt builder**

Create a small builder:

```ts
import type { ChatContext, ChatScenario } from '../types'

const scenarioLabels: Record<ChatScenario, string> = {
  greeting: '打招呼',
  pokeReply: '用户戳了你一下',
  petReply: '用户摸了摸你',
  todoComplete: '用户完成了一个 Todo',
  dailyComplete: '用户完成了每日任务',
  idleRemark: '空闲提醒',
  userMessage: '用户正在和你聊天',
  workStarted: '用户开始工作伙伴模式',
  workThinking: 'AI 工具正在思考',
  workFileEdit: 'AI 工具正在编辑文件',
  workError: 'AI 工具遇到错误',
  workComplete: 'AI 工具完成工作'
}

export function buildProviderSystemPrompt(context: ChatContext): string {
  return [
    `你是 PawDesk 桌宠 ${context.petName}。`,
    '你要用中文回复，语气像陪伴型桌宠，简短、自然、有温度。',
    '不要改变任务、生命值或工作状态，只生成一句聊天回复。',
    `当前状态：心情 ${Math.round(context.mood)}，精力 ${Math.round(context.energy)}，饥饿 ${Math.round(context.hunger)}，亲密 ${Math.round(context.intimacy)}。`,
    `每日任务 ${context.completedDailyCount}/${context.totalDailyCount}，Todo ${context.completedTodoCount}/${context.totalTodoCount}。`
  ].join('\n')
}

export function buildProviderUserPrompt(scenario: ChatScenario, userText?: string): string {
  const label = scenarioLabels[scenario]
  return userText?.trim() ? `${label}。用户说：${userText.trim()}` : `${label}。请回复一句适合当前情境的话。`
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: still may fail until later tasks wire all changed types.

## Task 4: OpenAI-compatible adapter

**Files:**
- Create: `src/domain/chat/providers/openai-chat.ts`
- Create: `src/domain/chat/providers/openai-chat.test.ts`

- [ ] **Step 1: Write adapter tests**

Test should inject `fetchFn` and assert URL, headers, body, and parsed text:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createOpenAIChatReply } from './openai-chat'

const context = { petName: '小爪', mood: 80, energy: 70, hunger: 30, intimacy: 60, completedDailyCount: 1, totalDailyCount: 3, completedTodoCount: 0, totalTodoCount: 2 }

test('calls OpenAI-compatible chat completions endpoint', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const fetchFn: typeof fetch = async (url, init) => {
    requestUrl = String(url)
    requestInit = init
    return new Response(JSON.stringify({ choices: [{ message: { content: '模型回复' } }] }), { status: 200 })
  }

  const reply = await createOpenAIChatReply({
    scenario: 'userMessage',
    context,
    userText: '你好',
    config: { enabled: true, mode: 'remote', provider: 'openai', protocol: 'openai-chat', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', apiKey: 'key' },
    fetchFn
  })

  assert.equal(reply, '模型回复')
  assert.equal(requestUrl, 'https://api.openai.com/v1/chat/completions')
  assert.equal(requestInit?.method, 'POST')
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer key')
  const body = JSON.parse(String(requestInit?.body))
  assert.equal(body.model, 'gpt-4o-mini')
  assert.equal(body.messages[0].role, 'system')
  assert.equal(body.messages[1].role, 'user')
})

test('throws when OpenAI-compatible response has no text', async () => {
  await assert.rejects(() => createOpenAIChatReply({
    scenario: 'userMessage',
    context,
    userText: '你好',
    config: { enabled: true, mode: 'remote', provider: 'openai', protocol: 'openai-chat', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', apiKey: 'key' },
    fetchFn: async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })
  }))
})
```

- [ ] **Step 2: Implement adapter**

Create `createOpenAIChatReply(options: ProviderReplyOptions): Promise<string>`:

- Use `options.fetchFn ?? fetch`.
- URL is `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`.
- Body includes `model` and two messages from prompt builder.
- Throw `new Error('OpenAI-compatible provider request failed')` for non-OK.
- Throw `new Error('OpenAI-compatible provider returned empty reply')` for missing content.

- [ ] **Step 3: Run adapter tests**

Run: `node --test src/domain/chat/providers/openai-chat.test.ts`

Expected: PASS.

## Task 5: Anthropic Messages adapter

**Files:**
- Create: `src/domain/chat/providers/anthropic-messages.ts`
- Create: `src/domain/chat/providers/anthropic-messages.test.ts`

- [ ] **Step 1: Write adapter tests**

Test URL, headers, body, and text block parsing:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAnthropicMessagesReply } from './anthropic-messages'

const context = { petName: '小爪', mood: 80, energy: 70, hunger: 30, intimacy: 60, completedDailyCount: 1, totalDailyCount: 3, completedTodoCount: 0, totalTodoCount: 2 }

test('calls Anthropic messages endpoint', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const fetchFn: typeof fetch = async (url, init) => {
    requestUrl = String(url)
    requestInit = init
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Claude 回复' }] }), { status: 200 })
  }

  const reply = await createAnthropicMessagesReply({
    scenario: 'userMessage',
    context,
    userText: '你好',
    config: { enabled: true, mode: 'remote', provider: 'anthropic', protocol: 'anthropic-messages', model: 'claude-opus-4-7', baseUrl: 'https://api.anthropic.com', apiKey: 'key' },
    fetchFn
  })

  assert.equal(reply, 'Claude 回复')
  assert.equal(requestUrl, 'https://api.anthropic.com/v1/messages')
  assert.equal((requestInit?.headers as Record<string, string>)['x-api-key'], 'key')
  assert.equal((requestInit?.headers as Record<string, string>)['anthropic-version'], '2023-06-01')
  const body = JSON.parse(String(requestInit?.body))
  assert.equal(body.model, 'claude-opus-4-7')
  assert.equal(body.max_tokens, 512)
  assert.equal(typeof body.system, 'string')
  assert.equal(body.messages[0].role, 'user')
})
```

- [ ] **Step 2: Implement adapter**

Create `createAnthropicMessagesReply(options: ProviderReplyOptions): Promise<string>`:

- URL is `${baseUrl}/v1/messages`.
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `Content-Type`.
- Body: `{ model, max_tokens: 512, system, messages: [{ role: 'user', content: userPrompt }] }`.
- Parse first `{ type: 'text', text: string }` block.
- Throw on non-OK or empty text.

- [ ] **Step 3: Run adapter tests**

Run: `node --test src/domain/chat/providers/anthropic-messages.test.ts`

Expected: PASS.

## Task 6: Registry and chat-service routing

**Files:**
- Create: `src/domain/chat/providers/registry.ts`
- Modify: `src/domain/chat/chat-service.ts`
- Modify: `src/domain/chat/chat-service.test.ts`
- Remove or ignore: `src/domain/chat/providers/claude.ts` once no longer imported.

- [ ] **Step 1: Add registry**

Create:

```ts
import type { ModelProtocol } from '../../../shared/types/model-config'
import type { ModelProviderAdapter } from './types'
import { createAnthropicMessagesReply } from './anthropic-messages'
import { createOpenAIChatReply } from './openai-chat'

export const remoteProviderAdapters: Partial<Record<ModelProtocol, ModelProviderAdapter>> = {
  'openai-chat': { createReply: createOpenAIChatReply },
  'anthropic-messages': { createReply: createAnthropicMessagesReply }
}

export function getRemoteProviderAdapter(protocol: ModelProtocol): ModelProviderAdapter | undefined {
  return remoteProviderAdapters[protocol]
}
```

- [ ] **Step 2: Update chat-service options/results**

Use:

```ts
interface CreatePetReplyOptions {
  personality?: PetPersonality
  providerAdapters?: Partial<Record<ModelProtocol, ModelProviderAdapter>>
  fetchFn?: typeof fetch
}

interface PetReplyResult {
  text: string
  source: ModelProviderId
  fallbackReason?: 'missing-api-key' | 'unsupported-provider' | 'provider-error'
}
```

Routing:

- local-template or disabled => local template.
- remote without key => local template + `missing-api-key`.
- no adapter => local template + `unsupported-provider`.
- adapter success => source `config.provider`.
- adapter throws => local template + `provider-error`.

- [ ] **Step 3: Update chat-service tests**

Replace Claude-specific injected provider test with adapter override tests:

```ts
test('uses injected OpenAI-compatible adapter when configuration is complete', async () => {
  const reply = await createPetReply(input, remoteOpenAIConfig, {
    personality,
    providerAdapters: {
      'openai-chat': { createReply: async () => '远程回复' }
    }
  })
  assert.equal(reply.text, '远程回复')
  assert.equal(reply.source, 'openai')
})

test('falls back when provider adapter throws', async () => {
  const reply = await createPetReply(input, remoteOpenAIConfig, {
    personality,
    providerAdapters: {
      'openai-chat': { createReply: async () => { throw new Error('boom') } }
    }
  })
  assert.equal(reply.source, 'local-template')
  assert.equal(reply.fallbackReason, 'provider-error')
})
```

Also update existing local/missing key tests to use `provider: 'anthropic'`, `protocol: 'anthropic-messages'`, `mode: 'remote'`.

- [ ] **Step 4: Run chat tests**

Run: `node --test src/domain/chat/chat-service.test.ts`

Expected: PASS.

## Task 7: PetSession save normalization

**Files:**
- Modify: `src/main/pet/pet-session.ts`
- Modify: `src/main/ipc/pet-events.ts` if save input type is widened.
- Modify: `src/preload/index.ts`
- Modify: `src/shared/types/electron.d.ts`

- [ ] **Step 1: Update imports and save signature**

Import `ModelConfigSaveInput` from store/types as needed.

Change `PetSession.saveModelConfig(config: ModelConfigSaveInput)` to:

```ts
const nextConfig = await saveModelConfig(this.modelConfig, config)
this.modelConfig = nextConfig
this.profile = {
  ...this.profile,
  modelConfig: toModelConfigSnapshot(nextConfig)
}
```

- [ ] **Step 2: Update preload/window typing**

Make renderer `saveModelConfig` accept `ModelConfigSaveInput` if exported from shared types, or keep accepting `ModelConfig` plus optional `clearApiKey` by defining a shared `ModelConfigInput` type.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`

Expected: may still fail until UI snapshot fallback is updated.

## Task 8: Renderer model panel

**Files:**
- Modify: `src/renderer/src/panel/PanelApp.tsx`
- Modify: `src/renderer/src/pet/usePetSnapshot.ts`

- [ ] **Step 1: Import presets**

Add imports:

```ts
import { getModelProviderPreset, modelProviderPresets } from '../../../domain/chat/providers/presets'
import type { ModelProviderId } from '../../../shared/types/model-config'
```

- [ ] **Step 2: Update ModelPanel state**

Use provider/protocol state instead of mode selection:

```ts
const [provider, setProvider] = useState<ModelProviderId>(modelConfig?.provider ?? 'local-template')
const preset = getModelProviderPreset(provider)
const [model, setModel] = useState(modelConfig?.model ?? preset.defaultModel)
const [baseUrl, setBaseUrl] = useState(modelConfig?.baseUrl ?? preset.defaultBaseUrl)
const [apiKey, setApiKey] = useState('')
```

On provider change, set provider, model default, and base URL default.

- [ ] **Step 3: Update save payload**

Save:

```ts
await window.pawdesk.pet.saveModelConfig({
  enabled: true,
  mode: provider === 'local-template' ? 'local-template' : 'remote',
  provider,
  protocol: preset.protocol,
  model: provider === 'local-template' ? 'template-v1' : model.trim(),
  baseUrl: provider === 'local-template' ? '' : baseUrl.trim(),
  apiKey: apiKey.trim()
})
```

Add clear key button:

```ts
await window.pawdesk.pet.saveModelConfig({
  enabled: true,
  mode: 'remote',
  provider,
  protocol: preset.protocol,
  model: model.trim(),
  baseUrl: baseUrl.trim(),
  apiKey: '',
  clearApiKey: true
})
```

- [ ] **Step 4: Update status pill**

Local: `本地模式`.
Remote with key: `${preset.label} 已配置`.
Remote without key: `缺少 Key`.

- [ ] **Step 5: Update browser fallback snapshot**

Add `protocol: 'local-template'` to `modelConfig` in `usePetSnapshot.ts`.

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS or only unrelated pre-existing errors; fix errors caused by this feature.

## Task 9: Full verification

**Files:**
- All changed files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test src/main/persistence/model-config-store.test.ts src/domain/chat/chat-service.test.ts src/domain/chat/providers/openai-chat.test.ts src/domain/chat/providers/anthropic-messages.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 3: Do not run dev server**

Do not run `pnpm run dev` in WSL. User will test Electron UI on Windows.

- [ ] **Step 4: Report verification**

Report changed files, tests run, and any UI testing not performed because WSL Electron dev testing was explicitly excluded.
