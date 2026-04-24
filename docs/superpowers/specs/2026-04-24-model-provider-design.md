# Model Provider Design

## Goal

Add configurable model provider support while preserving PawDesk's local-first product boundary: life state, tasks, rewards, and work mode stay deterministic and local; models only generate chat text.

## Architecture

- Keep the existing IPC entry point for model settings: renderer calls `saveModelConfig`, preload invokes `pet:save-model-config`, and `PetSession` persists the config.
- Replace hard-coded `mode === 'claude'` chat routing with a provider registry in the domain chat layer.
- Treat provider selection as explicit configuration, not as an alias of mode.
- Implement each provider as a small adapter under `src/domain/chat/providers/` behind a shared interface.
- Start with `local-template` and `claude`; keep the shape open for later OpenAI-compatible, Ollama, Gemini, or custom endpoint adapters.
- Keep local template as the default and fallback provider.

## Components

### `src/shared/types/model-config.ts`

- Expand provider types beyond the current `local-template | claude` pairing when new providers are introduced.
- Keep full `ModelConfig` for persistence and submit payloads.
- Keep `ModelConfigSnapshot` secret-safe with `hasApiKey`, never raw `apiKey`.
- Recommended fields for this phase: `enabled`, `provider`, `model`, `baseUrl`, `apiKey`.
- Optional tuning fields such as `temperature` and `maxTokens` can be added only when an adapter needs them.

### `src/domain/chat/providers/types.ts`

- Define a provider adapter interface with a reply method that receives scenario, context, optional user text, and normalized config.
- Keep adapter output to generated text so providers cannot mutate pet state.

### `src/domain/chat/providers/registry.ts`

- Map provider ids to adapters.
- Centralize supported-provider lookup.
- Keep unsupported-provider handling out of `PetSession`.

### `src/domain/chat/chat-service.ts`

- Use provider registry lookup instead of direct Claude branching.
- Preserve injected provider support in tests by allowing adapter overrides.
- Return fallback metadata when local-template is used because the selected provider cannot run.

### `src/main/persistence/model-config-store.ts`

- Continue storing config as JSON under Electron `userData/model-config.json`.
- Normalize loaded configs to a safe default if missing or invalid.
- Migrate older configs where `mode` and `provider` are coupled.
- Convert full config to secret-safe snapshot for profile/snapshot broadcasting.

### `src/renderer/src/panel/PanelApp.tsx`

- Update the Model panel to select provider directly.
- Show provider-specific fields such as model, base URL, and API key only when relevant.
- Stop saving `provider: mode`.
- Keep password input empty after save; use `hasApiKey` for status display.

## Data Flow

1. User opens the Model Config panel from the context menu or panel navigation.
2. Renderer reads `snapshot.modelConfig` and displays provider status from the secret-safe snapshot.
3. User selects provider, model, base URL, and API key, then saves.
4. Renderer calls `window.pawdesk.pet.saveModelConfig(config)`.
5. Preload invokes `pet:save-model-config`.
6. Main IPC forwards the config to `PetSession.saveModelConfig`.
7. `PetSession` persists the full config, updates profile with `ModelConfigSnapshot`, and broadcasts a new snapshot.
8. On chat, `PetSession.sendChat` calls `createPetReply(input, modelConfig)`.
9. `chat-service` resolves the configured provider adapter from the registry.
10. Adapter returns generated text; chat history stores only user text and generated pet text.
11. If the provider is disabled, unsupported, missing credentials, or fails, `chat-service` falls back to local-template.

## Error Handling

- Missing API key: fall back to local-template with `fallbackReason: 'missing-api-key'`.
- Unsupported provider: fall back to local-template with `fallbackReason: 'unsupported-provider'`.
- Disabled model config: use local-template without treating it as an error.
- Provider exception or network failure: catch in `chat-service`, fall back to local-template with `fallbackReason: 'provider-error'`, and avoid crashing `sendChat`.
- Invalid saved config: normalize on load to local-template, `template-v1`, empty key, and empty base URL.
- Secrets: never expose `apiKey` in snapshots, profile-visible state, logs, or renderer state loaded from snapshots.
- Base URL: normalize at the save/load boundary if custom endpoints are allowed; otherwise use provider defaults.

## Testing

- Unit test config normalization and migration in `model-config-store`.
- Unit test chat routing in `chat-service`:
  - local-template uses the local adapter.
  - Claude with a key uses the Claude adapter.
  - Claude without a key falls back with `missing-api-key`.
  - unknown provider falls back with `unsupported-provider`.
  - provider exception falls back with `provider-error`.
  - disabled config uses local-template.
- Keep provider network tests isolated with injected clients or fetch functions; unit tests should not call live APIs.
- Run `pnpm typecheck` after implementation.
- Manually verify the Model panel in Electron after UI changes: switch providers, save settings, confirm status updates, and verify blank key clears `hasApiKey`.

## Implementation Scope Recommendation

Approve configurable provider plumbing and safe fallback first. Defer real network SDK integration to a follow-up unless the implementation task explicitly requires live provider calls.
