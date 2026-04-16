import type { ChatMessage, ChatScenario, ChatState } from './types'

function createMessageId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function appendPetMessage(
  chatState: ChatState,
  scenario: ChatScenario,
  text: string,
  now: Date = new Date()
): ChatState {
  const nextMessage: ChatMessage = {
    id: createMessageId(),
    role: 'pet',
    text,
    createdAt: now.toISOString(),
    scenario
  }

  return {
    ...chatState,
    currentBubble: {
      text,
      createdAt: nextMessage.createdAt,
      scenario
    },
    messages: [...chatState.messages, nextMessage].slice(-20)
  }
}

export function appendUserMessage(chatState: ChatState, text: string, now: Date = new Date()): ChatState {
  const nextMessage: ChatMessage = {
    id: createMessageId(),
    role: 'user',
    text,
    createdAt: now.toISOString(),
    scenario: 'userInput'
  }

  return {
    ...chatState,
    messages: [...chatState.messages, nextMessage].slice(-20)
  }
}

export function clearBubble(chatState: ChatState): ChatState {
  return {
    ...chatState,
    currentBubble: null
  }
}
