import test from 'node:test'
import assert from 'node:assert/strict'
import { createPetReply } from './chat-service'
import type { ChatContext, PetPersonality } from './types'
import type { ModelConfig } from '../../shared/types/model-config'

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

const personality: PetPersonality = {
  baseType: '活泼',
  expressiveLevel: 0,
  verbosity: 0.7,
  affectionLevel: 0.65,
  favoriteWords: []
}

test('uses local template replies when mode is local-template', async () => {
  const reply = await createPetReply(
    {
      scenario: 'userMessage',
      context,
      userText: '你好'
    },
    {
      mode: 'local-template',
      provider: 'local-template',
      model: 'template-v1',
      enabled: true,
      apiKey: '',
      baseUrl: ''
    },
    { personality }
  )

  assert.equal(typeof reply.text, 'string')
  assert.equal(reply.source, 'local-template')
})

test('falls back to local template when Claude mode has no api key', async () => {
  const reply = await createPetReply(
    {
      scenario: 'userMessage',
      context,
      userText: '帮我总结一下'
    },
    {
      mode: 'claude',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      enabled: true,
      apiKey: '',
      baseUrl: 'https://api.anthropic.com'
    },
    { personality }
  )

  assert.equal(reply.source, 'local-template')
  assert.equal(reply.fallbackReason, 'missing-api-key')
})

test('uses injected Claude provider when configuration is complete', async () => {
  const reply = await createPetReply(
    {
      scenario: 'userMessage',
      context,
      userText: '今天做什么'
    },
    {
      mode: 'claude',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      enabled: true,
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com'
    },
    {
      personality,
      claudeProvider: async () => '这是 Claude 回复'
    }
  )

  assert.equal(reply.text, '这是 Claude 回复')
  assert.equal(reply.source, 'claude')
})
