import test from 'node:test'
import assert from 'node:assert/strict'
import { createAnthropicMessagesReply } from './anthropic-messages'
import type { ChatContext } from '../types'

const context: ChatContext = {
  petName: '小爪',
  mood: 80,
  energy: 70,
  hunger: 30,
  intimacy: 60,
  completedDailyCount: 1,
  totalDailyCount: 3,
  completedTodoCount: 0,
  totalTodoCount: 2
}

test('calls Anthropic messages endpoint', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const fetchFn: typeof fetch = async (url, init) => {
    requestUrl = String(url)
    requestInit = init
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Claude 回复' }] }), { status: 200 })
  }

  const reply = await createAnthropicMessagesReply({
    scenario: 'userMessage',
    context,
    userText: '你好',
    config: {
      enabled: true,
      mode: 'remote',
      provider: 'anthropic',
      protocol: 'anthropic-messages',
      model: 'claude-opus-4-7',
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'key'
    },
    fetchFn
  })

  assert.equal(reply, 'Claude 回复')
  assert.equal(requestUrl, 'https://api.anthropic.com/v1/messages')
  assert.equal((requestInit?.headers as Record<string, string>)['x-api-key'], 'key')
  assert.equal((requestInit?.headers as Record<string, string>)['anthropic-version'], '2023-06-01')
  const body = JSON.parse(String(requestInit?.body))
  assert.equal(body.model, 'claude-opus-4-7')
  assert.equal(body.max_tokens, 512)
  assert.equal(typeof body.system, 'string')
  assert.equal(body.messages[0].role, 'user')
})

test('throws when Anthropic response has no text block', async () => {
  await assert.rejects(() =>
    createAnthropicMessagesReply({
      scenario: 'userMessage',
      context,
      userText: '你好',
      config: {
        enabled: true,
        mode: 'remote',
        provider: 'anthropic',
        protocol: 'anthropic-messages',
        model: 'claude-opus-4-7',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'key'
      },
      fetchFn: async () => new Response(JSON.stringify({ content: [] }), { status: 200 })
    })
  )
})
