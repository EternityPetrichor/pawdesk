import { buildProviderSystemPrompt, buildProviderUserPrompt } from './prompt'
import { sanitizeProviderReply } from './sanitize'
import type { ProviderReplyOptions } from './types'

interface AnthropicMessagesResponse {
  content?: Array<{
    type?: unknown
    text?: unknown
  }>
}

export async function createAnthropicMessagesReply(options: ProviderReplyOptions): Promise<string> {
  const { config } = options
  const fetchFn = options.fetchFn ?? fetch
  const response = await fetchFn(`${config.baseUrl.replace(/\/+$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 512,
      system: buildProviderSystemPrompt(options.context),
      messages: [{ role: 'user', content: buildProviderUserPrompt(options.scenario, options.userText) }]
    })
  })

  if (!response.ok) {
    throw new Error('Anthropic provider request failed')
  }

  const data = (await response.json()) as AnthropicMessagesResponse
  const text = data.content?.find((block) => block.type === 'text' && typeof block.text === 'string')?.text

  if (typeof text !== 'string') {
    throw new Error('Anthropic provider returned empty reply')
  }

  const sanitizedText = sanitizeProviderReply(text)

  if (!sanitizedText) {
    throw new Error('Anthropic provider returned empty reply')
  }

  return sanitizedText
}
