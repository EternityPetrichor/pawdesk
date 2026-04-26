import { app } from 'electron'
import { join } from 'node:path'
import type { ModelConfig, ModelConfigInput, ModelConfigSnapshot, ModelMode, ModelProtocol, ModelProviderId } from '../../shared/types/model-config'
import { getModelProviderPreset } from '../../domain/chat/providers/presets'
import { readJsonFile, writeJsonFile } from './store'

const defaultModelConfig: ModelConfig = {
  enabled: true,
  mode: 'local-template',
  provider: 'local-template',
  protocol: 'local-template',
  model: 'template-v1',
  baseUrl: '',
  apiKey: ''
}

const providerIds: ModelProviderId[] = ['local-template', 'openai', 'gemini', 'minimax', 'glm', 'anthropic', 'custom-openai', 'custom-anthropic']

function getModelConfigPath(): string {
  return join(app.getPath('userData'), 'model-config.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readProvider(value: Record<string, unknown>): ModelProviderId {
  const provider = readString(value['provider'])
  const mode = readString(value['mode'])

  if (provider === 'claude' || mode === 'claude') {
    return 'anthropic'
  }

  return providerIds.includes(provider as ModelProviderId) ? (provider as ModelProviderId) : 'local-template'
}

function readProtocol(value: Record<string, unknown>, fallback: ModelProtocol): ModelProtocol {
  const protocol = readString(value['protocol'])
  return protocol === 'openai-chat' || protocol === 'anthropic-messages' || protocol === 'local-template' ? protocol : fallback
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sameRemoteTarget(current: ModelConfig, next: ModelConfig): boolean {
  return current.provider === next.provider && current.protocol === next.protocol && current.model === next.model && current.baseUrl === next.baseUrl
}

export function normalizeModelConfig(value: unknown): ModelConfig {
  if (!isRecord(value)) {
    return { ...defaultModelConfig }
  }

  const provider = readProvider(value)
  const preset = getModelProviderPreset(provider)

  if (provider === 'local-template') {
    return { ...defaultModelConfig, enabled: value['enabled'] !== false }
  }

  const model = readString(value['model']) || preset.defaultModel
  const candidateBaseUrl = normalizeBaseUrl(readString(value['baseUrl']) || preset.defaultBaseUrl)

  if (!model || !candidateBaseUrl || !isValidHttpUrl(candidateBaseUrl)) {
    return { ...defaultModelConfig }
  }

  const mode: ModelMode = readString(value['mode']) === 'claude' ? 'claude' : 'remote'

  const protocol = readProtocol(value, preset.protocol)

  return {
    enabled: value['enabled'] !== false,
    mode,
    provider,
    protocol,
    model,
    baseUrl: candidateBaseUrl,
    apiKey: readString(value['apiKey'])
  }
}

export function mergeModelConfigForSave(current: ModelConfig, input: ModelConfigInput): ModelConfig {
  const next = normalizeModelConfig(input)

  if (next.provider === 'local-template') {
    return next
  }

  if (input.clearApiKey) {
    return { ...next, apiKey: '' }
  }

  if (!next.apiKey && current.apiKey && sameRemoteTarget(current, next)) {
    return { ...next, apiKey: current.apiKey }
  }

  return next
}

export async function loadModelConfig(): Promise<ModelConfig> {
  return normalizeModelConfig(await readJsonFile<unknown>(getModelConfigPath()))
}

export async function saveModelConfig(current: ModelConfig, input: ModelConfigInput): Promise<ModelConfig> {
  const nextConfig = mergeModelConfigForSave(current, input)
  await writeJsonFile(getModelConfigPath(), nextConfig)
  return nextConfig
}

export function toModelConfigSnapshot(config: ModelConfig): ModelConfigSnapshot {
  return {
    enabled: config.enabled,
    mode: config.mode,
    provider: config.provider,
    protocol: config.protocol,
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: config.apiKey.trim().length > 0
  }
}

export function getDefaultModelConfig(): ModelConfig {
  return { ...defaultModelConfig }
}
