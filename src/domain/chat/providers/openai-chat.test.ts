import test from 'node:test'
import assert from 'node:assert/strict'
import { createOpenAIChatReply } from './openai-chat'
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

test('calls OpenAI-compatible chat completions endpoint', async () => {
  let requestUrl = ''
  let requestInit: RequestInit | undefined
  const fetchFn: typeof fetch = async (url, init) => {
    requestUrl = String(url)
    requestInit = init
    return new Response(JSON.stringify({ choices: [{ message: { content: '模型回复' } }] }), { status: 200 })
  }

  const reply = await createOpenAIChatReply({
    scenario: 'userMessage',
    context,
    userText: '你好',
    config: {
      enabled: true,
      mode: 'remote',
      provider: 'openai',
      protocol: 'openai-chat',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'key'
    },
    fetchFn
  })

  assert.equal(reply, '模型回复')
  assert.equal(requestUrl, 'https://api.openai.com/v1/chat/completions')
  assert.equal(requestInit?.method, 'POST')
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer key')
  const body = JSON.parse(String(requestInit?.body))
  assert.equal(body.model, 'gpt-4o-mini')
  assert.equal(body.messages[0].role, 'system')
  assert.equal(body.messages[1].role, 'user')
})

test('throws when OpenAI-compatible response has no text', async () => {
  await assert.rejects(() =>
    createOpenAIChatReply({
      scenario: 'userMessage',
      context,
      userText: '你好',
      config: {
        enabled: true,
        mode: 'remote',
        provider: 'openai',
        protocol: 'openai-chat',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'key'
      },
      fetchFn: async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })
    })
  )
})
