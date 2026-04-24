import { defaultPersonality } from './defaults'
import { promptTemplates } from './prompt-templates'
import type { ChatContext, ChatScenario, PetPersonality } from './types'
import type { ModelConfig, ModelProviderId, ModelProtocol } from '../../shared/types/model-config'
import { createLocalTemplateReply } from './providers/local-template'
import { getRemoteProviderAdapter, remoteProviderAdapters } from './providers/registry'
import type { ModelProviderAdapter } from './providers/types'

function pickFavoriteWord(personality: PetPersonality): string {
  return personality.favoriteWords[Math.floor(Math.random() * personality.favoriteWords.length)] ?? ''
}

function pickTemplate(scenario: ChatScenario): string {
  const options = promptTemplates[scenario]
  return options[Math.floor(Math.random() * options.length)] ?? ''
}

export function createTemplateReply(
  scenario: ChatScenario,
  context: ChatContext,
  userText?: string,
  personality: PetPersonality = defaultPersonality
): string {
  const suffix = personality.expressiveLevel > 0.6 ? pickFavoriteWord(personality) : ''

  if (scenario === 'userMessage' && userText) {
    if (context.hunger >= 70) {
      return `我有点饿${suffix}，不过我有在听你说：${userText.slice(0, 12)}`
    }

    if (context.mood >= 75) {
      return `听起来不错${suffix}，${userText.slice(0, 12)}让我也开心起来了`
    }

    return `${pickTemplate('userMessage')}${suffix}`
  }

  if (scenario === 'idleRemark' && context.totalTodoCount > context.completedTodoCount) {
    return `还有 ${context.totalTodoCount - context.completedTodoCount} 个 Todo 在等你${suffix}`
  }

  if (scenario === 'dailyComplete' && context.completedDailyCount === context.totalDailyCount) {
    return `今天的每日任务全完成啦${suffix}`
  }

  if (scenario === 'workFileEdit' && userText) {
    return `我看到它在改 ${userText}${suffix}`
  }

  if (scenario === 'workComplete' && context.totalTodoCount > context.completedTodoCount) {
    return `工作完成啦${suffix}，要不要顺手清一个 Todo？`
  }

  return `${pickTemplate(scenario)}${suffix}`
}

interface CreatePetReplyInput {
  scenario: ChatScenario
  context: ChatContext
  userText?: string
}

interface CreatePetReplyOptions {
  personality?: PetPersonality
  providerAdapters?: Partial<Record<ModelProtocol, ModelProviderAdapter>>
  fetchFn?: typeof fetch
}

interface PetReplyResult {
  text: string
  source: ModelProviderId
  fallbackReason?: 'missing-api-key' | 'unsupported-provider' | 'provider-error'
}

export async function createPetReply(
  input: CreatePetReplyInput,
  config: ModelConfig,
  options: CreatePetReplyOptions = {}
): Promise<PetReplyResult> {
  const personality = options.personality ?? defaultPersonality

  async function createFallback(fallbackReason?: PetReplyResult['fallbackReason']): Promise<PetReplyResult> {
    return {
      text: await createLocalTemplateReply({
        scenario: input.scenario,
        context: input.context,
        userText: input.userText,
        personality
      }),
      source: 'local-template',
      fallbackReason
    }
  }

  if (!config.enabled || config.protocol === 'local-template' || config.provider === 'local-template') {
    return createFallback()
  }

  if (!config.apiKey.trim()) {
    return createFallback('missing-api-key')
  }

  const adapter = options.providerAdapters?.[config.protocol] ?? remoteProviderAdapters[config.protocol] ?? getRemoteProviderAdapter(config.protocol)

  if (!adapter) {
    return createFallback('unsupported-provider')
  }

  try {
    return {
      text: await adapter.createReply({
        scenario: input.scenario,
        context: input.context,
        userText: input.userText,
        config,
        fetchFn: options.fetchFn
      }),
      source: config.provider
    }
  } catch {
    return createFallback('provider-error')
  }
}
