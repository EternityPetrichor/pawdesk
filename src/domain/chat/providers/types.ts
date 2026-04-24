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
