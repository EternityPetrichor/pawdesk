# Model Provider Design

## Goal

Make PawDesk's chat model configuration fully usable with real network providers while preserving the local-first product boundary: life state, tasks, rewards, work mode, and pet state transitions remain deterministic and local; configured models only generate chat text.

The implementation must support:

- Built-in presets for GPT/OpenAI, Gemini, MiniMax, GLM/Zhipu/Z.ai, Anthropic, and local template replies.
- User-defined custom providers based on either the OpenAI Chat Completions protocol or Anthropic Messages protocol.
- Real non-streaming chat calls after a user saves a valid remote provider configuration.
- Safe fallback to local template replies when remote providers are disabled, misconfigured, unsupported, or fail.

## Architecture

Use a protocol-adapter architecture rather than one adapter per vendor.

- Keep the existing local template provider as the default and fallback.
- Replace hard-coded `mode === 'claude'` routing with provider lookup through a registry.
- Store provider presets as configuration metadata: provider id, display name, protocol, default base URL, default model, and whether the base URL is editable.
- Implement real network calls with native `fetch`, not OpenAI or Anthropic SDK dependencies.
- Add two remote protocol adapters:
  - `openai-chat`: calls `POST {baseUrl}/chat/completions` using Bearer auth.
  - `anthropic-messages`: calls `POST {baseUrl}/v1/messages` using `x-api-key` and `anthropic-version` headers.
- Normalize PawDesk's internal chat request into provider-specific wire payloads inside adapters.
- Keep `PetSession` unaware of provider details; it only passes the saved `ModelConfig` to `createPetReply`.

This avoids pretending Anthropic is OpenAI-compatible while keeping Gemini, MiniMax, GLM, GPT, and custom OpenAI-compatible endpoints on one path.

## Provider Presets

Built-in presets:

| Provider | Protocol | Default Base URL | Default Model | Notes |
| --- | --- | --- | --- | --- |
| Local template | `local-template` | empty | `template-v1` | No API key or network. |
| GPT / OpenAI | `openai-chat` | `https://api.openai.com/v1` | `gpt-4o-mini` | Standard Chat Completions path. |
| Gemini | `openai-chat` | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` | Uses Google's OpenAI compatibility layer. |
| MiniMax | `openai-chat` | `https://api.minimaxi.com/v1` | `MiniMax-M1` | OpenAI-compatible chat endpoint. |
| GLM / Z.ai | `openai-chat` | `https://api.z.ai/api/paas/v4` | `glm-4.5-flash` | Allow editing base URL for coding endpoint variants. |
| Anthropic | `anthropic-messages` | `https://api.anthropic.com` | `claude-sonnet-4-6` | Native Messages API, not OpenAI-compatible. |
| Custom OpenAI-compatible | `openai-chat` | user input | user input | User controls base URL and model. |
| Custom Anthropic-compatible | `anthropic-messages` | user input | user input | User controls base URL and model. |

Base URLs are stored without trailing slash. Adapters append their protocol path exactly once.

## Data Model

Update `src/shared/types/model-config.ts` around these concepts:

- `ModelProtocol = 'local-template' | 'openai-chat' | 'anthropic-messages'`
- `ModelProviderId = 'local-template' | 'openai' | 'gemini' | 'minimax' | 'glm' | 'anthropic' | 'custom-openai' | 'custom-anthropic'`
- `ModelConfig` keeps the persisted secret-bearing state:
  - `enabled: boolean`
  - `provider: ModelProviderId`
  - `protocol: ModelProtocol`
  - `model: string`
  - `baseUrl: string`
  - `apiKey: string`
- Keep `mode` only as a migration compatibility field while older saved configs may exist. New routing must use `protocol` and `provider`.
- `ModelConfigSnapshot` mirrors non-secret fields and exposes only `hasApiKey`, never `apiKey`.

Do not add tuning fields such as temperature, max tokens UI controls, streaming, model listing, tool use, JSON mode, or vision in this implementation. Adapters may hard-code a conservative `max_tokens` for Anthropic because the API requires it.

## Components

### `src/shared/types/model-config.ts`

Define provider/protocol types, config interfaces, and preset metadata types. Keep these shared so renderer and domain code agree on provider ids and protocols.

### `src/domain/chat/providers/presets.ts`

Export the built-in provider preset list. Each preset contains display label, protocol, default model, default base URL, and whether API key/base URL/model fields are required.

### `src/domain/chat/providers/types.ts`

Define a shared adapter interface:

```ts
interface ModelProviderAdapter {
  createReply(options: ProviderReplyOptions): Promise<string>
}
```

`ProviderReplyOptions` receives scenario, context, optional user text, config, and an optional `fetch` override for tests.

### `src/domain/chat/providers/openai-chat.ts`

Implement non-streaming OpenAI-compatible chat:

- Build messages with a system prompt describing PawDesk's pet persona and current context.
- Add the user message when present.
- POST to `{baseUrl}/chat/completions`.
- Headers: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`.
- Body: `{ model, messages }`.
- Parse `choices[0].message.content` as the reply text.
- Throw on non-2xx responses or missing reply content so `chat-service` can fallback.

### `src/domain/chat/providers/anthropic-messages.ts`

Implement non-streaming Anthropic Messages:

- Put PawDesk persona/context in top-level `system`.
- Put the user text or scenario instruction in `messages` as a user message.
- POST to `{baseUrl}/v1/messages`.
- Headers: `x-api-key`, `anthropic-version`, `Content-Type`.
- Body: `{ model, max_tokens, system, messages }`.
- Parse the first text content block from `content`.
- Throw on non-2xx responses or missing text.

### `src/domain/chat/providers/registry.ts`

Map protocols to adapters and expose lookup helpers. Unsupported protocol/provider cases should be handled by `chat-service`, not `PetSession`.

### `src/domain/chat/chat-service.ts`

Replace direct Claude branching with:

1. If config disabled or local-template, use local template.
2. If remote protocol and API key missing, fallback with `missing-api-key`.
3. Resolve adapter by protocol.
4. Call adapter.
5. On unsupported provider/protocol or thrown provider error, fallback to local template with metadata.

Extend `PetReplyResult.source` to include remote provider ids or a generic remote source while preserving local-template behavior.

### `src/main/persistence/model-config-store.ts`

Continue using `userData/model-config.json`, but normalize all loaded and saved configs:

- Missing/invalid provider defaults to local-template.
- Preset provider fills default protocol, base URL, and model when missing.
- Custom providers require editable base URL and model.
- Base URL must be absolute `http` or `https` for remote providers.
- Empty password field preserves the existing key when provider/protocol/model/base URL are unchanged.
- Add an explicit clear-key path; switching to local-template also clears the key.
- Snapshot conversion must never include `apiKey`.

### `src/renderer/src/panel/PanelApp.tsx`

Update Model panel UI:

- Provider select lists built-in presets and custom OpenAI/Anthropic options.
- Provider selection fills default model and base URL.
- Remote providers show model, base URL, and password key fields.
- Local template hides remote fields.
- Empty key input means “keep existing key” when `hasApiKey` is true.
- Provide a clear-key button when a saved key exists.
- Status pill distinguishes local, configured remote provider, and missing key.

The UI should remain simple; no streaming controls or advanced parameter controls.

## Data Flow

1. User opens Model Config from the panel or context menu.
2. Renderer reads `snapshot.modelConfig`, which includes provider, protocol, model, base URL, and `hasApiKey`.
3. User selects a built-in or custom provider, edits model/base URL/key, and saves.
4. Renderer calls `window.pawdesk.pet.saveModelConfig(config)`.
5. Preload invokes `pet:save-model-config`.
6. Main IPC forwards to `PetSession.saveModelConfig`.
7. `PetSession` asks the config store to normalize/persist the full secret-bearing config.
8. `PetSession` stores the normalized config in memory, updates profile with `ModelConfigSnapshot`, and broadcasts the snapshot.
9. On chat, `PetSession.sendChat` calls `createPetReply(input, modelConfig)`.
10. `chat-service` chooses local template or the remote adapter by protocol.
11. Remote adapter performs the real HTTP request and returns text.
12. Chat history stores only user text and generated pet text.
13. If any provider precondition or request fails, local template reply is used instead.

## Error Handling

- Missing API key: fallback to local template with `fallbackReason: 'missing-api-key'`.
- Unsupported provider/protocol: fallback with `fallbackReason: 'unsupported-provider'`.
- Invalid base URL on save/load: normalize to the provider default when available; custom providers with invalid base URL fall back to local-template.
- Network failure, non-2xx HTTP, malformed provider response, or empty reply: catch in `chat-service` and fallback with `fallbackReason: 'provider-error'`.
- Disabled model config: use local-template without treating it as an error.
- Empty password field: preserve existing key for unchanged remote provider config; clear only through the explicit clear-key action or local-template switch.
- Secrets: never expose API keys through snapshots, profile-visible state, renderer initialization, logs, or error messages.

## Testing

Unit tests should avoid live network calls by injecting a fetch function into adapters or `createPetReply` options.

Required coverage:

- Config normalization and migration from old `mode: 'claude'` configs.
- Provider preset default filling.
- Key preservation on empty password save.
- Explicit key clearing.
- Local-template routing.
- OpenAI-compatible adapter request path, headers, body, and response parsing.
- Anthropic adapter request path, headers, body, and text block parsing.
- Missing API key fallback.
- Unsupported provider/protocol fallback.
- Provider exception fallback.
- Disabled config uses local-template.

Run `pnpm typecheck` after implementation. Do not run `pnpm run dev` in WSL; the user will test the Electron UI on Windows.

## Implementation Scope

This implementation is complete when a user can configure a built-in or custom provider, save it, and receive real model-generated chat replies from valid OpenAI-compatible or Anthropic-compatible endpoints.

Out of scope for this task:

- Streaming responses.
- Tool calling.
- Vision or file inputs.
- Provider model-list fetching.
- Advanced tuning UI.
- SDK dependencies.
- Live integration tests against external APIs.
