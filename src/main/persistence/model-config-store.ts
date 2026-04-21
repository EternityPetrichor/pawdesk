import { app } from 'electron'
import { join } from 'node:path'
import type { ModelConfig, ModelConfigSnapshot } from '../../shared/types/model-config'
import { readJsonFile, writeJsonFile } from './store'

const defaultModelConfig: ModelConfig = {
  enabled: true,
  mode: 'local-template',
  provider: 'local-template',
  model: 'template-v1',
  baseUrl: '',
  apiKey: ''
}

function getModelConfigPath(): string {
  return join(app.getPath('userData'), 'model-config.json')
}

export async function loadModelConfig(): Promise<ModelConfig> {
  return (await readJsonFile<ModelConfig>(getModelConfigPath())) ?? defaultModelConfig
}

export async function saveModelConfig(config: ModelConfig): Promise<void> {
  await writeJsonFile(getModelConfigPath(), config)
}

export function toModelConfigSnapshot(config: ModelConfig): ModelConfigSnapshot {
  return {
    enabled: config.enabled,
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: config.apiKey.trim().length > 0
  }
}

export function getDefaultModelConfig(): ModelConfig {
  return defaultModelConfig
}
