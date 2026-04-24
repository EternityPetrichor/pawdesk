import { buildProviderSystemPrompt, buildProviderUserPrompt } from './prompt'
import type { ProviderReplyOptions } from './types'

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

export async function createOpenAIChatReply(options: ProviderReplyOptions): Promise<string> {
  const { config } = options
  const fetchFn = options.fetchFn ?? fetch
  const response = await fetchFn(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: buildProviderSystemPrompt(options.context) },
        { role: 'user', content: buildProviderUserPrompt(options.scenario, options.userText) }
      ]
    })
  })

  if (!response.ok) {
    throw new Error('OpenAI-compatible provider request failed')
  }

  const data = (await response.json()) as OpenAIChatResponse
  const text = data.choices?.[0]?.message?.content

  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenAI-compatible provider returned empty reply')
  }

  return text.trim()
}
