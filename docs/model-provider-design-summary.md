# PawDesk 模型提供商设计总结

## 目标

PawDesk 的模型配置只负责桌宠聊天回复生成，不改变生命值、任务、Todo、工作伙伴状态等本地规则状态。用户可以选择内置供应商或自定义入口，并在供应商下独立选择 OpenAI 兼容协议或 Anthropic Messages 协议。

## 核心模型

模型配置分为三层：

- `provider`：用户选择的供应商模板，例如 OpenAI、Gemini、MiniMax、GLM、Anthropic、Custom。
- `protocol`：实际请求协议，目前支持 `openai-chat` 和 `anthropic-messages`，本地模板为 `local-template`。
- `model/baseUrl/apiKey`：实际请求参数，由供应商模板填默认值，但用户可以编辑。

这样供应商不再强绑定协议：Gemini 可以默认使用 OpenAI 兼容协议，也可以被用户切换成 Anthropic Messages 协议；Anthropic 同理默认 Anthropic Messages，但也允许改成 OpenAI 兼容入口以适配代理网关。

## 内置供应商模板

内置模板位于 `src/domain/chat/providers/presets.ts`：

- 本地模板回复：不需要 API Key，不发网络请求。
- GPT / OpenAI：默认 OpenAI 兼容协议，默认 `https://api.openai.com/v1`。
- Gemini：默认 OpenAI 兼容协议，默认 Gemini OpenAI-compatible endpoint。
- MiniMax：默认 OpenAI 兼容协议。
- GLM / Z.ai：默认 OpenAI 兼容协议。
- Anthropic / Claude：默认 Anthropic Messages 协议。
- 自定义 OpenAI 兼容：空模型和空 Base URL，由用户填写。
- 自定义 Anthropic 兼容：空模型和空 Base URL，由用户填写。

模板的职责是提供默认值，不负责限制用户最终协议选择。

## 协议适配器

远程请求通过 `src/domain/chat/providers/registry.ts` 按 `protocol` 路由：

- `openai-chat` → `src/domain/chat/providers/openai-chat.ts`
  - 请求：`POST {baseUrl}/chat/completions`
  - Header：`Authorization: Bearer <apiKey>`
  - Body：`model` + `messages`
  - 响应：读取 `choices[0].message.content`

- `anthropic-messages` → `src/domain/chat/providers/anthropic-messages.ts`
  - 请求：`POST {baseUrl}/v1/messages`
  - Header：`x-api-key`、`anthropic-version: 2023-06-01`
  - Body：`model`、`max_tokens`、`system`、`messages`
  - 响应：读取第一个 `{ type: 'text', text: string }` 内容块

Prompt 构造位于 `src/domain/chat/providers/prompt.ts`，将桌宠状态、场景、用户输入转换为 provider-neutral 的 system/user prompt。

## 持久化与密钥安全

配置持久化位于 `src/main/persistence/model-config-store.ts`：

- 主进程保存 `ModelConfigCollection`，包含 `activeId` 和多个已保存配置项。
- 每个配置项包含 `id/name/config`，其中 `config` 保存完整 `ModelConfig`，包括 API Key。
- 旧版单配置 JSON 会在读取时自动迁移为一个默认配置项。
- 渲染进程拿到 `ModelConfigCollectionSnapshot`，每个配置只暴露 `hasApiKey`，不暴露真实密钥。
- 保存配置时，如果用户没有输入新 Key 且 provider/protocol/model/baseUrl 未变，保留旧 Key。
- 用户点击清除 Key 时通过 `clearApiKey: true` 显式清除。
- 老配置 `provider: claude` 或 `mode: claude` 会迁移到 `provider: anthropic`。
- 明确保存的 `protocol` 会被保留，不再被供应商默认协议覆盖。

## UI 行为

模型配置面板位于 `src/renderer/src/panel/PanelApp.tsx`：

1. 用户先从“已保存配置”下拉框选择一个配置。
2. 选择后表单加载该配置的名称、供应商、协议、模型和 Base URL。
3. 用户可以点击“新建配置”，表单会进入未保存的新配置状态，保存时创建新的配置项。
4. 用户可以点击“启用选中配置”，让后续聊天使用该配置。
5. 用户可以编辑后保存，保存会更新当前配置项并设为启用项。
6. 用户选择供应商时，UI 自动填入该供应商默认模型、Base URL、默认协议。
7. 用户可以单独修改协议为 OpenAI 兼容或 Anthropic Messages。
8. 用户填写或保留 API Key。
9. 保存时提交 `id + name + provider + protocol + model + baseUrl + apiKey`。

面板会监听主进程 snapshot 更新，避免首次 snapshot 为空时把配置错误地覆盖回本地模板。

## 聊天输入体验

聊天面板位于 `src/renderer/src/pet/ChatPanel.tsx`：

- 用户提交消息后，输入框立即清空。
- 等待模型回复期间输入框禁用，发送按钮显示“回复中...”。
- 用户消息仍会先进入聊天记录，模型回复完成后再追加桌宠回复。

## 模型回复清洗

远程适配器返回文本后会经过 `src/domain/chat/providers/sanitize.ts`：

- 删除 `<think>...</think>` 思考块。
- 删除 ```think fenced block。
- 清洗后为空会视为无效响应并 fallback。

## 聊天气泡位置

桌面宠物气泡位于 `src/renderer/src/pet/ChatBubble.tsx`：

- 根据宠物窗口位置判断左右半屏。
- 宠物在屏幕左侧时，气泡显示在宠物右侧。
- 宠物在屏幕右侧时，气泡显示在宠物左侧。
- 长文本限制最大宽高并允许滚动，避免遮住宠物主体。

## 聊天调用与 fallback

聊天入口位于 `src/domain/chat/chat-service.ts`：

- 本地模板或 disabled：直接本地模板回复。
- 远程配置缺少 API Key：fallback 到本地模板，原因 `missing-api-key`。
- 协议没有适配器：fallback 到本地模板，原因 `unsupported-provider`。
- 请求失败、鉴权失败、响应格式异常：fallback 到本地模板，原因 `provider-error`，并在控制台打印 warning。
- 请求成功：返回远程模型文本，source 为当前 provider。

## 验证

当前实现通过 TypeScript 类型检查：

```bash
pnpm typecheck
```

Electron UI 和真实供应商连通性需要在 Windows 环境中手动验证，因为 WSL 环境不运行 `pnpm run dev`。
