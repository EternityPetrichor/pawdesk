import { BrowserWindow } from 'electron'
import { appendPetMessage, appendUserMessage, clearBubble } from '../../domain/chat/chat-history'
import { buildChatContext } from '../../domain/chat/context-builder'
import { createPetReply, createTemplateReply } from '../../domain/chat/chat-service'
import type { ChatScenario } from '../../domain/chat/types'
import type { PetInteractionType, PetProfile } from '../../domain/life/types'
import { applyLifeInteraction, applyTaskReward, createSnapshot, hydrateProfile, updateProfilePosition } from '../../domain/life/pet-state-machine'
import { markDailyRewardApplied, updateDailyProgress } from '../../domain/tasks/daily-tasks'
import { getCompletedUnclaimedTasks, getTaskReward, getTodoReward } from '../../domain/tasks/rewards'
import { addTodo, removeTodo, toggleTodo } from '../../domain/tasks/todo-store'
import { WorkModeSession } from '../../integrations/workmode/session'
import type { ModelConfig, ModelConfigInput } from '../../shared/types/model-config'
import type { PetPosition, PetSnapshot, TodoScope, WorkEventPayload, WorkModeState, WorkTool } from '../../shared/types/pet'
import { getDefaultModelConfig, loadModelConfig, saveModelConfig, toModelConfigSnapshot } from '../persistence/model-config-store'
import { loadProfile, saveProfile } from '../persistence/profile-store'

export class PetSession {
  private profile: PetProfile | null = null
  private modelConfig: ModelConfig = getDefaultModelConfig()
  private readonly snapshotListeners = new Set<(snapshot: PetSnapshot) => void>()
  private readonly animationStateListeners = new Set<(state: PetSnapshot['derived']['animationState']) => void>()
  private readonly workModeSession = new WorkModeSession()

  constructor(private readonly petWindow: BrowserWindow) {}

  async initialize(position: PetPosition): Promise<void> {
    const storedProfile = await loadProfile()
    this.profile = hydrateProfile(storedProfile)
    this.profile.position = position
    this.modelConfig = await loadModelConfig()
    this.profile.modelConfig = toModelConfigSnapshot(this.modelConfig)
    await saveProfile(this.profile)
  }

  getSnapshot(): PetSnapshot {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    return {
      ...createSnapshot(this.profile),
      modelConfig: toModelConfigSnapshot(this.modelConfig),
      workMode: this.workModeSession.getState()
    }
  }

  onSnapshotChange(listener: (snapshot: PetSnapshot) => void): () => void {
    this.snapshotListeners.add(listener)
    return () => {
      this.snapshotListeners.delete(listener)
    }
  }

  onAnimationStateChange(listener: (state: PetSnapshot['derived']['animationState']) => void): () => void {
    this.animationStateListeners.add(listener)
    return () => {
      this.animationStateListeners.delete(listener)
    }
  }

  async applyInteraction(type: PetInteractionType): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    this.profile = applyLifeInteraction(this.profile, type)
    this.profile.tasks = updateDailyProgress(this.profile.tasks, type === 'pet' ? 'petting' : 'interaction')
    this.addPetMessage(type === 'pet' ? 'petReply' : 'pokeReply')
    this.applyCompletedDailyRewards()

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async feedPet(type: 'cookie' | 'apple'): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    this.profile = applyTaskReward(
      this.profile,
      type === 'cookie'
        ? { mood: 2, energy: 1, hunger: -12, intimacy: 1 }
        : { mood: 3, energy: 2, hunger: -18, intimacy: 1 }
    )
    this.addPetMessage('idleRemark', type === 'cookie' ? '小饼干真香' : '苹果好甜呀')

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async addTodo(title: string, scope: TodoScope): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    this.profile = {
      ...this.profile,
      tasks: addTodo(this.profile.tasks, title, scope)
    }

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async toggleTodo(todoId: string): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    const todo = this.profile.tasks.todos.find((item) => item.id === todoId)
    const willComplete = todo !== undefined && !todo.completed

    this.profile = {
      ...this.profile,
      tasks: toggleTodo(this.profile.tasks, todoId)
    }

    if (willComplete) {
      this.profile = applyTaskReward(this.profile, getTodoReward())
      this.profile.tasks = updateDailyProgress(this.profile.tasks, 'todoComplete')
      this.addPetMessage('todoComplete')
      this.applyCompletedDailyRewards()
    }

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async removeTodo(todoId: string): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    this.profile = {
      ...this.profile,
      tasks: removeTodo(this.profile.tasks, todoId)
    }

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async sendChat(text: string): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    const trimmed = text.trim()
    if (!trimmed) {
      return this.getSnapshot()
    }

    this.profile = {
      ...this.profile,
      chat: appendUserMessage(this.profile.chat, trimmed)
    }

    const reply = await createPetReply(
      {
        scenario: 'userMessage',
        context: buildChatContext(this.getSnapshot()),
        userText: trimmed
      },
      this.modelConfig
    )

    this.profile = {
      ...this.profile,
      chat: appendPetMessage(this.profile.chat, 'userMessage', reply.text),
      modelConfig: toModelConfigSnapshot(this.modelConfig)
    }

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async clearCurrentBubble(): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    this.profile = {
      ...this.profile,
      chat: clearBubble(this.profile.chat)
    }

    await saveProfile(this.profile)
    this.broadcastSnapshot()

    return this.getSnapshot()
  }

  async saveModelConfig(config: ModelConfigInput): Promise<PetSnapshot> {
    if (!this.profile) {
      throw new Error('Pet session is not initialized')
    }

    const nextConfig = await saveModelConfig(this.modelConfig, config)
    this.modelConfig = nextConfig
    this.profile = {
      ...this.profile,
      modelConfig: toModelConfigSnapshot(nextConfig)
    }
    await saveProfile(this.profile)
    this.broadcastSnapshot()
    return this.getSnapshot()
  }

  async toggleWorkMode(enabled: boolean): Promise<PetSnapshot> {
    this.workModeSession.setEnabled(enabled)

    if (enabled) {
      this.addPetMessage('workStarted')
    }

    this.broadcastSnapshot()
    return this.getSnapshot()
  }

  async setWorkTool(tool: WorkTool): Promise<PetSnapshot> {
    this.workModeSession.setTool(tool)
    this.broadcastSnapshot()
    return this.getSnapshot()
  }

  async applyWorkEvent(event: WorkEventPayload): Promise<PetSnapshot> {
    const state = this.workModeSession.applyEvent(event)

    if (state.lastEvent?.type === 'tool.thinking') {
      this.addPetMessage('workThinking')
    }

    if (state.lastEvent?.type === 'tool.file_edit') {
      this.addPetMessage('workFileEdit', state.lastEvent.filePath)
    }

    if (state.lastEvent?.type === 'tool.error') {
      this.addPetMessage('workError')
    }

    if (state.lastEvent?.type === 'tool.complete') {
      this.addPetMessage('workComplete')
    }

    this.broadcastSnapshot()
    return this.getSnapshot()
  }

  getWorkModeState(): WorkModeState {
    return this.workModeSession.getState()
  }

  setWorkModeServerPort(port: number): void {
    this.workModeSession.setPort(port)
  }

  async updatePosition(position: PetPosition): Promise<void> {
    if (!this.profile) {
      return
    }

    this.profile = updateProfilePosition(this.profile, position)
    await saveProfile(this.profile)
    this.broadcastSnapshot()
  }

  broadcastSnapshot(): void {
    if (!this.profile) {
      return
    }

    const snapshot = this.getSnapshot()
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window.isDestroyed()) {
        return
      }

      window.webContents.send('pet:snapshot', snapshot)
      window.webContents.send('pet:animation-state', snapshot.derived.animationState)
    })
    this.snapshotListeners.forEach((listener) => listener(snapshot))
    this.animationStateListeners.forEach((listener) => listener(snapshot.derived.animationState))
  }

  private addPetMessage(scenario: ChatScenario, userText?: string): void {
    if (!this.profile) {
      return
    }

    const text = createTemplateReply(scenario, buildChatContext(this.getSnapshot()), userText)
    this.profile = {
      ...this.profile,
      chat: appendPetMessage(this.profile.chat, scenario, text)
    }
  }

  private applyCompletedDailyRewards(): void {
    if (!this.profile) {
      return
    }

    const completedTasks = getCompletedUnclaimedTasks(this.profile.tasks.daily)
    for (const task of completedTasks) {
      const reward = getTaskReward(task.id)
      if (!reward) {
        continue
      }

      this.profile = applyTaskReward(this.profile, reward)
      this.profile.tasks = markDailyRewardApplied(this.profile.tasks, task.id)
      this.addPetMessage('dailyComplete')
    }
  }
}
