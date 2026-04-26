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

export interface ModelConfigInput extends Partial<ModelConfig> {
  id?: string
  name?: string
  clearApiKey?: boolean
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

export interface SavedModelConfigSnapshot extends ModelConfigSnapshot {
  id: string
  name: string
  active: boolean
}

export interface ModelConfigCollectionSnapshot {
  activeId: string
  items: SavedModelConfigSnapshot[]
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
