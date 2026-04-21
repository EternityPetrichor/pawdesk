import type { ChatBubble, ChatMessage, ChatScenario, ChatState } from '../../shared/types/pet'

export type { ChatBubble, ChatMessage, ChatScenario, ChatState }

export interface ChatContext {
  petName: string
  mood: number
  energy: number
  hunger: number
  intimacy: number
  completedDailyCount: number
  totalDailyCount: number
  completedTodoCount: number
  totalTodoCount: number
}

export interface PetPersonality {
  baseType: string
  expressiveLevel: number
  verbosity: number
  affectionLevel: number
  favoriteWords: string[]
}

export interface ModelConfigState {
  enabled: boolean
  mode: 'local-template' | 'claude'
  provider: 'local-template' | 'claude'
  model: string
  baseUrl: string
  hasApiKey: boolean
}
