import type { ChatState, PetAnimationState, PetPosition, TaskState, WorkModeState } from '../../shared/types/pet'
import type { ModelConfigSnapshot } from '../../shared/types/model-config'

export type PetInteractionType = 'wake' | 'poke' | 'pet' | 'drag'

export interface PetLifeStats {
  mood: number
  energy: number
  hunger: number
  intimacy: number
  lastUpdatedAt: string
}

export interface PetIdentity {
  name: string
  createdAt: string
}

export interface PetProfile {
  identity: PetIdentity
  stats: PetLifeStats
  position: PetPosition
  tasks: TaskState
  chat: ChatState
  modelConfig?: ModelConfigSnapshot
}

export interface LifeInteractionDelta {
  mood: number
  energy: number
  hunger: number
  intimacy: number
}

export interface LifeRatesPerHour {
  moodDecay: number
  energyDecay: number
  hungerIncrease: number
  intimacyDecay: number
}

export interface LifeThresholds {
  happyMood: number
  lowEnergy: number
  highHunger: number
  bondedIntimacy: number
}

export interface LifeConfig {
  defaults: {
    name: string
    mood: number
    energy: number
    hunger: number
    intimacy: number
    position: PetPosition
  }
  ratesPerHour: LifeRatesPerHour
  interactions: Record<PetInteractionType, LifeInteractionDelta>
  thresholds: LifeThresholds
}

export interface PetDerivedState {
  animationState: PetAnimationState
  moodLabel: string
  statusText: string
  isSleeping: boolean
}

export interface PetSnapshot {
  identity: PetIdentity
  stats: PetLifeStats
  position: PetPosition
  derived: PetDerivedState
  tasks: TaskState
  chat: ChatState
  modelConfig?: ModelConfigSnapshot
  workMode?: WorkModeState
}
