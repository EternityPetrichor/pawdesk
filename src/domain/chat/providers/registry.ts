import type { ModelProtocol } from '../../../shared/types/model-config'
import { createAnthropicMessagesReply } from './anthropic-messages'
import { createOpenAIChatReply } from './openai-chat'
import type { ModelProviderAdapter } from './types'

export const remoteProviderAdapters: Partial<Record<ModelProtocol, ModelProviderAdapter>> = {
  'openai-chat': { createReply: createOpenAIChatReply },
  'anthropic-messages': { createReply: createAnthropicMessagesReply }
}

export function getRemoteProviderAdapter(protocol: ModelProtocol): ModelProviderAdapter | undefined {
  return remoteProviderAdapters[protocol]
}
