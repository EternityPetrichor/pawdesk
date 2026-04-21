export type ModelMode = 'local-template' | 'claude'
export type ModelProvider = 'local-template' | 'claude'

export interface ModelConfig {
  enabled: boolean
  mode: ModelMode
  provider: ModelProvider
  model: string
  baseUrl: string
  apiKey: string
}

export interface ModelConfigSnapshot {
  enabled: boolean
  mode: ModelMode
  provider: ModelProvider
  model: string
  baseUrl: string
  hasApiKey: boolean
}
