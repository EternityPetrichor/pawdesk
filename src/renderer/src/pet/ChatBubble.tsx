import type { ChatBubble as ChatBubbleType } from '../../../shared/types/pet'

interface ChatBubbleProps {
  bubble: ChatBubbleType | null
}

function getShortScenarioLabel(scenario: ChatBubbleType['scenario']): string {
  switch (scenario) {
    case 'greeting':
      return '问候'
    case 'pokeReply':
      return '回应'
    case 'petReply':
      return '撒娇'
    case 'todoComplete':
      return '奖励'
    case 'dailyComplete':
      return '完成'
    case 'idleRemark':
      return '陪伴'
    default:
      return '小爪'
  }
}

export function ChatBubble({ bubble }: ChatBubbleProps) {
  if (!bubble) {
    return null
  }

  return (
    <div className="chat-bubble">
      <span className="chat-bubble-tag">{getShortScenarioLabel(bubble.scenario)}</span>
      <p>{bubble.text}</p>
    </div>
  )
}
