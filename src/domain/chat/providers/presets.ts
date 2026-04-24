import type { ModelProviderId, ModelProviderPreset } from '../../../shared/types/model-config'

export const modelProviderPresets: ModelProviderPreset[] = [
  {
    id: 'local-template',
    label: '本地模板回复',
    protocol: 'local-template',
    defaultModel: 'template-v1',
    defaultBaseUrl: '',
    requiresApiKey: false,
    editableBaseUrl: false,
    custom: false
  },
  {
    id: 'openai',
    label: 'GPT / OpenAI',
    protocol: 'openai-chat',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'gemini',
    label: 'Gemini',
    protocol: 'openai-chat',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    protocol: 'openai-chat',
    defaultModel: 'MiniMax-M1',
    defaultBaseUrl: 'https://api.minimaxi.com/v1',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'glm',
    label: 'GLM / Z.ai',
    protocol: 'openai-chat',
    defaultModel: 'glm-4.5-flash',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    protocol: 'anthropic-messages',
    defaultModel: 'claude-opus-4-7',
    defaultBaseUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: false
  },
  {
    id: 'custom-openai',
    label: '自定义 OpenAI 兼容',
    protocol: 'openai-chat',
    defaultModel: '',
    defaultBaseUrl: '',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: true
  },
  {
    id: 'custom-anthropic',
    label: '自定义 Anthropic 兼容',
    protocol: 'anthropic-messages',
    defaultModel: '',
    defaultBaseUrl: '',
    requiresApiKey: true,
    editableBaseUrl: true,
    custom: true
  }
]

export function getModelProviderPreset(provider: ModelProviderId): ModelProviderPreset {
  return modelProviderPresets.find((preset) => preset.id === provider) ?? modelProviderPresets[0]
}
