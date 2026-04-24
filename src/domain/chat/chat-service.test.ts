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

const localConfig: ModelConfig = {
  mode: 'local-template',
  provider: 'local-template',
  protocol: 'local-template',
  model: 'template-v1',
  enabled: true,
  apiKey: '',
  baseUrl: ''
}

const remoteOpenAIConfig: ModelConfig = {
  mode: 'remote',
  provider: 'openai',
  protocol: 'openai-chat',
  model: 'gpt-4o-mini',
  enabled: true,
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1'
}

const input = {
  scenario: 'userMessage' as const,
  context,
  userText: '你好'
}

test('uses local template replies when mode is local-template', async () => {
  const reply = await createPetReply(input, localConfig, { personality })

  assert.equal(typeof reply.text, 'string')
  assert.equal(reply.source, 'local-template')
})

test('falls back to local template when remote provider has no api key', async () => {
  const reply = await createPetReply(
    {
      scenario: 'userMessage',
      context,
      userText: '帮我总结一下'
    },
    {
      ...remoteOpenAIConfig,
      apiKey: ''
    },
    { personality }
  )

  assert.equal(reply.source, 'local-template')
  assert.equal(reply.fallbackReason, 'missing-api-key')
})

test('uses injected OpenAI-compatible adapter when configuration is complete', async () => {
  const reply = await createPetReply(input, remoteOpenAIConfig, {
    personality,
    providerAdapters: {
      'openai-chat': { createReply: async () => '远程回复' }
    }
  })

  assert.equal(reply.text, '远程回复')
  assert.equal(reply.source, 'openai')
})

test('falls back when provider adapter throws', async () => {
  const reply = await createPetReply(input, remoteOpenAIConfig, {
    personality,
    providerAdapters: {
      'openai-chat': {
        createReply: async () => {
          throw new Error('boom')
        }
      }
    }
  })

  assert.equal(reply.source, 'local-template')
  assert.equal(reply.fallbackReason, 'provider-error')
})
