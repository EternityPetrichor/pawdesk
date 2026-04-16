import { useState } from 'react'
import type { PetSnapshot } from '../../../shared/types/pet'
import { useChatActions } from './useChatActions'

interface ChatPanelProps {
  snapshot: PetSnapshot | null
}

export function ChatPanel({ snapshot }: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const { sendChat } = useChatActions()
  const messages = snapshot?.chat.messages.slice(-5) ?? []

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextMessage = message.trim()
    if (!nextMessage) {
      return
    }

    await sendChat(nextMessage)
    setMessage('')
  }

  return (
    <section className="chat-panel panel-card">
      <div className="panel-section-header chat-panel-header">
        <div>
          <span className="panel-kicker">Companion chat</span>
          <h2>聊天</h2>
        </div>
        <span className="panel-status-pill">最近 {messages.length} 条</span>
      </div>

      <p className="panel-muted">和 {snapshot?.identity.name ?? '小爪'} 说说今天的安排，它会把最近几句对话留在这里。</p>

      <ul className="chat-history">
        {messages.length > 0 ? (
          messages.map((messageItem) => (
            <li key={messageItem.id} className={`chat-message chat-${messageItem.role}`}>
              <div className="chat-message-meta">
                <strong>{messageItem.role === 'pet' ? snapshot?.identity.name ?? '小爪' : '你'}</strong>
                <span>{messageItem.role === 'pet' ? '陪伴回应' : '输入内容'}</span>
              </div>
              <p>{messageItem.text}</p>
            </li>
          ))
        ) : (
          <li className="chat-message chat-empty">
            <div className="chat-message-meta">
              <strong>{snapshot?.identity.name ?? '小爪'}</strong>
              <span>等待开场</span>
            </div>
            <p>还没有聊天记录，先和小爪打个招呼吧。</p>
          </li>
        )}
      </ul>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="和小爪说句话..."
        />
        <button type="submit">发送</button>
      </form>
    </section>
  )
}
