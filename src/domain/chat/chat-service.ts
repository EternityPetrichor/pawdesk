import { defaultPersonality } from './defaults'
import { promptTemplates } from './prompt-templates'
import type { ChatContext, ChatScenario, PetPersonality } from './types'

function pickFavoriteWord(personality: PetPersonality): string {
  return personality.favoriteWords[Math.floor(Math.random() * personality.favoriteWords.length)] ?? ''
}

function pickTemplate(scenario: ChatScenario): string {
  const options = promptTemplates[scenario]
  return options[Math.floor(Math.random() * options.length)] ?? ''
}

export function createPetReply(
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
