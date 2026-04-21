import type { ChatContext, ChatScenario, PetPersonality } from '../types'
import { createTemplateReply } from '../chat-service'

interface LocalTemplateReplyOptions {
  scenario: ChatScenario
  context: ChatContext
  userText?: string
  personality: PetPersonality
}

export async function createLocalTemplateReply(options: LocalTemplateReplyOptions): Promise<string> {
  return createTemplateReply(options.scenario, options.context, options.userText, options.personality)
}
