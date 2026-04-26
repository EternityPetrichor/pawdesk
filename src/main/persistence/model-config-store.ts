import { app } from 'electron'
import { join } from 'node:path'
import type {
  ModelConfig,
  ModelConfigCollectionSnapshot,
  ModelConfigInput,
  ModelConfigSnapshot,
  ModelMode,
  ModelProtocol,
  ModelProviderId,
  SavedModelConfigSnapshot
} from '../../shared/types/model-config'
import { getModelProviderPreset } from '../../domain/chat/providers/presets'
import { readJsonFile, writeJsonFile } from './store'

interface SavedModelConfig {
  id: string
  name: string
  config: ModelConfig
}

interface ModelConfigCollection {
  activeId: string
  items: SavedModelConfig[]
}

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

function createConfigId(): string {
  return `model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createConfigName(config: ModelConfig): string {
  return config.provider === 'local-template' ? '本地模板回复' : `${config.provider} / ${config.protocol} / ${config.model}`
}

function readCollection(value: unknown): ModelConfigCollection {
  if (isRecord(value) && Array.isArray(value['items'])) {
    const items = value['items']
      .map((item): SavedModelConfig | null => {
        if (!isRecord(item)) {
          return null
        }

        const id = readString(item['id']) || createConfigId()
        const name = readString(item['name'])
        const config = normalizeModelConfig(item['config'])
        return { id, name: name || createConfigName(config), config }
      })
      .filter((item): item is SavedModelConfig => item !== null)

    if (items.length > 0) {
      const activeId = readString(value['activeId'])
      return {
        activeId: items.some((item) => item.id === activeId) ? activeId : items[0].id,
        items
      }
    }
  }

  const config = normalizeModelConfig(value)
  return {
    activeId: 'default',
    items: [{ id: 'default', name: createConfigName(config), config }]
  }
}

export function getActiveModelConfig(collection: ModelConfigCollection): ModelConfig {
  return collection.items.find((item) => item.id === collection.activeId)?.config ?? collection.items[0]?.config ?? { ...defaultModelConfig }
}

export function toModelConfigCollectionSnapshot(collection: ModelConfigCollection): ModelConfigCollectionSnapshot {
  return {
    activeId: collection.activeId,
    items: collection.items.map((item): SavedModelConfigSnapshot => ({
      id: item.id,
      name: item.name,
      active: item.id === collection.activeId,
      ...toModelConfigSnapshot(item.config)
    }))
  }
}

export function saveModelConfigToCollection(collection: ModelConfigCollection, input: ModelConfigInput): ModelConfigCollection {
  const currentItem = collection.items.find((item) => item.id === (input.id ?? collection.activeId))
  const currentConfig = currentItem?.config ?? getActiveModelConfig(collection)
  const nextConfig = mergeModelConfigForSave(currentConfig, input)
  const nextId = input.id && currentItem ? input.id : createConfigId()
  const nextName = readString(input.name) || currentItem?.name || createConfigName(nextConfig)
  const nextItem = { id: nextId, name: nextName, config: nextConfig }
  const replaced = collection.items.some((item) => item.id === nextId)
  const items = replaced ? collection.items.map((item) => (item.id === nextId ? nextItem : item)) : [...collection.items, nextItem]

  return {
    activeId: nextId,
    items
  }
}

export function activateModelConfigInCollection(collection: ModelConfigCollection, id: string): ModelConfigCollection {
  return collection.items.some((item) => item.id === id) ? { ...collection, activeId: id } : collection
}

export async function loadModelConfigCollection(): Promise<ModelConfigCollection> {
  return readCollection(await readJsonFile<unknown>(getModelConfigPath()))
}

export async function saveModelConfigCollection(collection: ModelConfigCollection): Promise<void> {
  await writeJsonFile(getModelConfigPath(), collection)
}

export async function loadModelConfig(): Promise<ModelConfig> {
  return getActiveModelConfig(await loadModelConfigCollection())
}

export async function saveModelConfig(_current: ModelConfig, input: ModelConfigInput): Promise<ModelConfig> {
  const collection = await loadModelConfigCollection()
  const nextCollection = saveModelConfigToCollection(collection, input)
  await saveModelConfigCollection(nextCollection)
  return getActiveModelConfig(nextCollection)
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
