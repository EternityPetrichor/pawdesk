import personalityJson from '../../../config/personality.json'
import type { ChatState, PetPersonality } from './types'

export const defaultPersonality = personalityJson as PetPersonality

export function createDefaultChatState(): ChatState {
  return {
    currentBubble: null,
    messages: [],
    cooldowns: {
      lastIdleRemarkAt: null
    }
  }
}
