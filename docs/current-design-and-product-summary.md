# PawDesk 当前阶段设计与产品行为总结

## 目标与范围

PawDesk 当前这一阶段的实现目标，是让桌宠的“聊天能力”和“陪伴表现”都可配置，但仍坚持本地状态驱动的产品边界：

- 模型配置只负责桌宠聊天回复生成。
- 生命值、任务、Todo、工作伙伴状态仍由本地规则系统驱动。
- 用户可保存多套模型配置，并在不同供应商、协议、模型入口之间切换。
- 桌宠的聊天气泡展示节奏也由用户可见、可调的设置控制。

当前文档总结的是这一阶段已经形成的设计决策、产品行为和代码落点，方便后续继续迭代时快速理解现状。

## 模型提供商架构

模型配置分为三层：

- `provider`：用户选择的供应商模板，例如 OpenAI、Gemini、MiniMax、GLM、Anthropic、Custom。
- `protocol`：实际请求协议，目前支持 `openai-chat`、`anthropic-messages`，本地模板为 `local-template`。
- `model/baseUrl/apiKey`：实际请求参数，由供应商模板填默认值，但用户可以继续修改。

这样设计的核心原因，是把“供应商默认值”和“真实请求协议”解耦：

- Gemini 默认可以走 OpenAI 兼容协议；
- Anthropic 默认走 Anthropic Messages；
- 但用户最终仍可以在供应商下独立切换协议，以适配代理网关、自建中转或兼容层。

内置模板位于 `src/domain/chat/providers/presets.ts`：

- 本地模板回复：不需要 API Key，不发网络请求。
- GPT / OpenAI：默认 OpenAI 兼容协议，默认 `https://api.openai.com/v1`。
- Gemini：默认 OpenAI 兼容协议，默认 Gemini OpenAI-compatible endpoint。
- MiniMax：默认 OpenAI 兼容协议。
- GLM / Z.ai：默认 OpenAI 兼容协议。
- Anthropic / Claude：默认 Anthropic Messages 协议。
- 自定义 OpenAI 兼容：空模型和空 Base URL，由用户填写。
- 自定义 Anthropic 兼容：空模型和空 Base URL，由用户填写。

模板的职责只是提供默认值，不负责锁死最终协议。

## 协议适配器与聊天调用路径

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

Prompt 构造位于 `src/domain/chat/providers/prompt.ts`，负责把桌宠状态、场景、用户输入转换成 provider-neutral 的 system/user prompt。

聊天入口位于 `src/domain/chat/chat-service.ts`，当前行为如下：

- 本地模板或 disabled：直接本地模板回复。
- 远程配置缺少 API Key：fallback 到本地模板，原因 `missing-api-key`。
- 协议没有适配器：fallback 到本地模板，原因 `unsupported-provider`。
- 请求失败、鉴权失败、响应格式异常：fallback 到本地模板，原因 `provider-error`，并在控制台打印 warning。
- 请求成功：返回远程模型文本，`source` 为当前 provider。

这个设计确保了“配置失败不至于让聊天彻底不可用”，而是退回到本地模板陪伴逻辑。

## 配置持久化与多配置管理

模型配置持久化位于 `src/main/persistence/model-config-store.ts`。

当前不再只保存单个配置，而是保存 `ModelConfigCollection`：

- 顶层包含 `activeId`，表示当前启用项。
- `items` 中保存多个已保存配置。
- 每个配置项包含 `id/name/config`。
- `config` 中保存完整 `ModelConfig`，包括 API Key。

渲染进程不会直接拿到真实密钥，而是拿到 `ModelConfigCollectionSnapshot`：

- 每个配置只暴露 `hasApiKey`。
- 不暴露真实 `apiKey`。

已有持久化行为包括：

- 旧版单配置 JSON 会在读取时自动迁移为一个默认配置项。
- 老配置 `provider: claude` 或 `mode: claude` 会迁移到 `provider: anthropic`。
- 明确保存的 `protocol` 会被保留，不再被供应商默认协议覆盖。
- 如果用户保存时没有输入新 Key，且 provider/protocol/model/baseUrl 未变，则保留旧 Key。
- 用户点击清除 Key 时，通过 `clearApiKey: true` 显式清除。

主进程中的 `src/main/pet/pet-session.ts` 会在初始化时读取当前启用配置，并在 snapshot 中返回：

- `modelConfig`：当前启用项快照
- `modelConfigs`：整个多配置快照列表

## 模型配置面板的产品行为

模型配置面板位于 `src/renderer/src/panel/PanelApp.tsx`。

当前用户可见的行为是：

1. 用户先从“已保存配置”下拉框选择某个配置。
2. 选择后，表单加载该配置的名称、供应商、协议、模型和 Base URL。
3. 用户点击“新建配置”后，表单进入未保存的新配置状态。
4. 用户保存新配置时，会创建新的配置项，而不是覆盖当前已选项。
5. 用户可以点击“启用选中配置”，决定后续聊天到底使用哪一套配置。
6. 用户编辑某个已存在配置后保存，会更新该配置内容，并把它设为启用项。
7. 用户选择供应商时，UI 会自动带出默认模型、Base URL、默认协议。
8. 用户仍可以单独修改协议为 OpenAI 兼容或 Anthropic Messages。
9. 远程配置支持 API Key 留空保留、单独清除、重新录入。

渲染层还做了一个重要同步处理：面板会监听主进程 snapshot 更新，避免首次 snapshot 尚未到达时，把表单默认值错误地保存回本地模板配置。

## 聊天输入体验

聊天面板位于 `src/renderer/src/pet/ChatPanel.tsx`。

当前聊天输入体验是：

- 用户提交消息后，输入框立即清空。
- 在等待模型回复期间，输入框禁用。
- 发送按钮会显示“回复中...”。
- 用户消息会先进入聊天记录。
- 模型回复完成后，再追加桌宠回复。

这个行为比“输入框一直保留待发送内容直到模型返回”更符合聊天产品直觉，也避免用户误以为没有发送成功。

## 模型回复清洗与 fallback 策略

远程适配器返回文本后，会经过 `src/domain/chat/providers/sanitize.ts` 清洗：

- 删除 `<think>...</think>` 思考块。
- 删除 ```think fenced block。
- 清洗后如果为空，则视为无效响应并进入 fallback。

这一步是因为部分供应商或兼容网关会返回思考内容，直接展示会破坏产品表现，也会让用户看到不该暴露的中间推理结构。

当前 fallback 策略保持一致：

- 配置缺失时不报错中断，而是退回本地模板。
- 返回格式异常也不直接透出错误给用户，而是继续给出桌宠式回复。
- 同时保留控制台 warning，方便开发阶段定位供应商问题。

## 桌宠气泡策略的演进与当前方案

桌宠气泡渲染位于 `src/renderer/src/pet/ChatBubble.tsx`，样式位于 `src/renderer/src/styles.css`。

这一块经历过一次策略调整：

### 曾尝试的方向

曾尝试根据宠物在屏幕左右位置，动态把气泡切到宠物左右侧，以减少长文本遮挡宠物主体的问题。

对应思路是：

- 宠物在屏幕左侧时，气泡显示在宠物右侧。
- 宠物在屏幕右侧时，气泡显示在宠物左侧。
- 长文本限制最大宽高，并允许滚动。

### 暴露出的产品问题

在实际拖动过程中，这种“根据位置实时切换气泡侧边”的做法会带来额外重排与视觉跳变，导致：

- 拖动手感不够丝滑。
- 气泡在拖动中动态变化显得多余。
- 长文本滚动条样式也显得粗糙，不够精致。

### 当前定下来的方案

最终回到更稳定的顶置气泡方案：

- 气泡固定显示在宠物上方。
- 长文本设置最大宽高，并允许内部滚动。
- 滚动条改为更细、更圆润的视觉风格。
- 不再在拖动时根据左右位置动态切换气泡侧边。

这个方案的取舍是：

- 放弃了更激进的“左右智能停靠”；
- 换来更稳定的拖动性能和更统一的视觉表现；
- 更符合当前这个较小透明宠物窗口的实际条件。

## 设置页中的陪伴节奏配置

陪伴节奏设置当前已经进入设置页，UI 位于 `src/renderer/src/panel/PanelApp.tsx`，领域定义位于 `src/domain/life/settings.ts`。

当前支持两个可配置项：

- `bubbleDurationSeconds`
  - 默认值：10 秒
  - 最小值：3 秒
  - 最大值：120 秒

- `idleSpeechIntervalSeconds`
  - 默认值：30 秒
  - 最小值：5 秒
  - 最大值：600 秒

这些设置会被规范化：

- 非法值会回退到默认值。
- 超出范围的值会被 clamp 到支持范围内。

用户可在设置页直接编辑这两个数值并保存，保存入口通过：

- preload：`pet:save-behavior-settings`
- main：`PetSession.saveBehaviorSettings()`

## 陪伴节奏的运行时行为

运行时行为集中在 `src/main/pet/pet-session.ts`：

### 1. 聊天气泡自动消失

- 当桌宠产生新的 `currentBubble` 后，会启动气泡清理定时器。
- 定时器时长取 `profile.behavior.bubbleDurationSeconds`。
- 到时后自动调用 `clearBubble` 清空当前气泡，并广播新 snapshot。
- 如果用户手动清除气泡，也会同时清理已有 timer，避免重复触发。

### 2. 长时间无主动聊天时的主动发言

- 初始化完成后会启动 idle speech timer。
- 每次用户主动聊天后，会记录最近一次用户聊天时间，并重置 idle speech timer。
- 到达 `idleSpeechIntervalSeconds` 后，如果最近没有新的用户主动聊天，则会插入一条本地陪伴话术。
- 当前主动话术是本地固定文案池，例如“我在这陪着你呀”“要不要和我说句话”。
- 主动发言后会再次调度下一轮 idle speech timer。

### 3. 当前范围刻意收窄

这轮实现只做了“本地默认陪伴话术的定时触发”，没有扩展到：

- 后台定时调用大模型；
- 更复杂的空闲状态判断；
- 工作模式、任务状态与主动发言内容的深度联动。

这是刻意保持 YAGNI 的结果，先把用户可感知的陪伴节奏能力做出来，再决定是否继续升级为更复杂的主动陪伴系统。

## 相关类型与快照扩展

为了让设置可持久化、可渲染、可同步，这一阶段还扩展了共享类型：

- `src/shared/types/pet.ts`
  - 增加 `PetBehaviorSettings`
  - `PetSnapshot` 中增加 `behavior`

- `src/domain/life/types.ts`
  - `PetProfile` 中增加 `behavior`
  - life 域自己的 `PetSnapshot` 中增加 `behavior`

- `src/domain/life/defaults.ts`
  - 默认档案中注入默认 behavior 配置

- `src/domain/life/pet-state-machine.ts`
  - hydrate 时会对旧档案的 behavior 做 normalize，保证历史数据也能兼容

这意味着旧 profile 即使没有这一字段，也会在新版本初始化时自动补齐默认陪伴设置。

## 当前限制与验证方式

当前这一阶段已经通过的基础验证主要是 TypeScript 类型检查：

```bash
pnpm typecheck
```

另外还有针对陪伴设置归一化的测试入口：

- `src/domain/life/settings.test.ts`

但由于当前工程在 WSL 环境下不运行 `pnpm run dev` 做 Electron UI 联调，因此以下内容仍依赖 Windows 环境手动验证：

- 模型供应商真实联网连通性
- 多配置切换后的真实聊天效果
- 设置页保存后，桌宠气泡消失时间是否符合预期
- 长时间空闲后，主动发言是否按配置触发
- 拖动时气泡稳定性和整体交互手感

## 当前阶段结论

到当前为止，PawDesk 已经形成了一个较明确的分层：

- **聊天能力层**：本地模板 + 远程 provider 协议适配 + fallback
- **配置管理层**：多配置持久化 + 安全 snapshot + 激活切换
- **桌宠表现层**：聊天记录、顶部气泡、回复清洗、主动陪伴节奏
- **本地状态层**：生命值、任务、Todo、工作伙伴模式继续由本地规则控制

这套设计保证了几个关键产品目标：

- 即使远程模型不可用，桌宠仍然是“活的”。
- 用户可以保存多套不同的模型入口，不需要反复覆盖填写。
- 桌宠的表现节奏开始具备用户可调性。
- 当前实现尽量避免把复杂度过早堆到主动智能、跨窗口布局或后台 agent 行为上。

后续如果继续演进，比较自然的方向会是：

- 基于 idle 场景扩展更多本地陪伴话术；
- 把主动发言从纯本地模板升级为“可选走大模型”；
- 如果未来要做真正左右停靠气泡，更适合引入独立气泡窗口，而不是继续挤在当前宠物透明窗口内。
