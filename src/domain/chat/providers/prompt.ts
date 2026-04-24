import type { ChatContext, ChatScenario } from '../types'

const scenarioLabels: Record<ChatScenario, string> = {
  greeting: '打招呼',
  pokeReply: '用户戳了你一下',
  petReply: '用户摸了摸你',
  todoComplete: '用户完成了一个 Todo',
  dailyComplete: '用户完成了每日任务',
  idleRemark: '空闲提醒',
  userMessage: '用户正在和你聊天',
  workStarted: '用户开始工作伙伴模式',
  workThinking: 'AI 工具正在思考',
  workFileEdit: 'AI 工具正在编辑文件',
  workError: 'AI 工具遇到错误',
  workComplete: 'AI 工具完成工作'
}

export function buildProviderSystemPrompt(context: ChatContext): string {
  return [
    `你是 PawDesk 桌宠 ${context.petName}。`,
    '你要用中文回复，语气像陪伴型桌宠，简短、自然、有温度。',
    '不要改变任务、生命值或工作状态，只生成一句聊天回复。',
    `当前状态：心情 ${Math.round(context.mood)}，精力 ${Math.round(context.energy)}，饥饿 ${Math.round(context.hunger)}，亲密 ${Math.round(context.intimacy)}。`,
    `每日任务 ${context.completedDailyCount}/${context.totalDailyCount}，Todo ${context.completedTodoCount}/${context.totalTodoCount}。`
  ].join('\n')
}

export function buildProviderUserPrompt(scenario: ChatScenario, userText?: string): string {
  const label = scenarioLabels[scenario]
  const trimmed = userText?.trim()
  return trimmed ? `${label}。用户说：${trimmed}` : `${label}。请回复一句适合当前情境的话。`
}
