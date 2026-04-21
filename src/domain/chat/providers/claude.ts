import type { ChatContext, ChatScenario } from '../types'
import type { ModelConfig } from '../../../shared/types/model-config'

interface ClaudeReplyOptions {
  scenario: ChatScenario
  context: ChatContext
  userText?: string
  config: ModelConfig
}

export async function createClaudeReply(_options: ClaudeReplyOptions): Promise<string> {
  throw new Error('Claude provider is not wired yet')
}
