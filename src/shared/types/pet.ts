import type { ModelConfigCollectionSnapshot, ModelConfigSnapshot } from './model-config'

export type PetAnimationState = 'idle' | 'happy' | 'petting' | 'dragging'
export type PetInteractionType = 'wake' | 'poke' | 'pet' | 'drag'
export type DailyTaskType = 'interaction' | 'petting' | 'todoComplete'
export type WorkTool = 'claude-code' | 'codex' | 'cursor' | 'gemini'
export type TodoScope = 'today' | 'longTerm'
export type WorkEventType =
  | 'tool.started'
  | 'tool.thinking'
  | 'tool.file_edit'
  | 'tool.error'
  | 'tool.complete'
  | 'tool.waiting_permission'
  | 'tool.idle'
export type ChatScenario =
  | 'greeting'
  | 'pokeReply'
  | 'petReply'
  | 'todoComplete'
  | 'dailyComplete'
  | 'idleRemark'
  | 'userMessage'
  | 'workStarted'
  | 'workThinking'
  | 'workFileEdit'
  | 'workError'
  | 'workComplete'

export interface PetPosition {
  x: number
  y: number
}

export interface PetPointerMovePayload {
  screenX: number
  screenY: number
  petX?: number
  petY?: number
  petWidth?: number
  petHeight?: number
}

export interface PetDragStartPayload {
  screenX: number
  screenY: number
}

export interface PetLifeStats {
  mood: number
  energy: number
  hunger: number
  intimacy: number
  lastUpdatedAt: string
}

export interface PetDerivedState {
  animationState: PetAnimationState
  moodLabel: string
  statusText: string
  isSleeping: boolean
}

export interface TaskReward {
  mood: number
  energy: number
  hunger: number
  intimacy: number
}

export interface DailyTask {
  id: string
  title: string
  type: DailyTaskType
  target: number
  progress: number
  completed: boolean
  rewardApplied: boolean
}

export interface TodoItem {
  id: string
  title: string
  completed: boolean
  createdAt: string
  completedAt: string | null
  scope: TodoScope
  assignedDate: string
  carryoverCount: number
}

export interface TodoHistoryItem {
  id: string
  title: string
  scope: TodoScope
  createdAt: string
  completedAt: string
  completedDate: string
  carryoverCount: number
}

export interface TaskSummary {
  completedDailyCount: number
  totalDailyCount: number
  completedTodoCount: number
  totalTodoCount: number
}

export interface TaskState {
  lastRefreshedOn: string
  daily: DailyTask[]
  todos: TodoItem[]
  todoHistory: TodoHistoryItem[]
  summary?: TaskSummary
}

export interface ChatMessage {
  id: string
  role: 'pet' | 'user'
  text: string
  createdAt: string
  scenario: ChatScenario | 'userInput'
}

export interface ChatBubble {
  text: string
  createdAt: string
  scenario: ChatScenario
}

export interface ChatCooldowns {
  lastIdleRemarkAt: string | null
}

export interface ChatState {
  currentBubble: ChatBubble | null
  messages: ChatMessage[]
  cooldowns: ChatCooldowns
}

export interface PetBehaviorSettings {
  bubbleDurationSeconds: number
  idleSpeechIntervalSeconds: number
}

export interface WorkEventPayload {
  tool: WorkTool
  type: WorkEventType
  message: string
  filePath?: string
  timestamp: string
}

export interface WorkModeSummary {
  errorCount: number
  recentFiles: string[]
  lastCompletedAt: string | null
  lastActiveAt: string | null
}

export interface WorkModeState {
  enabled: boolean
  tool: WorkTool
  status: WorkEventType | 'disabled'
  lastEvent: WorkEventPayload | null
  connection: 'idle' | 'listening' | 'error'
  summary: WorkModeSummary
  server: {
    port: number | null
  }
}

export interface PetSnapshot {
  identity: {
    name: string
    createdAt: string
  }
  stats: PetLifeStats
  position: PetPosition
  derived: PetDerivedState
  tasks: TaskState
  chat: ChatState
  behavior: PetBehaviorSettings
  modelConfig: ModelConfigSnapshot
  modelConfigs: ModelConfigCollectionSnapshot
  workMode: WorkModeState
}
