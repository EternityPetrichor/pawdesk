import type { DailyTask, DailyTaskType, TaskReward, TaskState, TodoHistoryItem, TodoItem, TodoScope } from '../../shared/types/pet'

export type { DailyTask, DailyTaskType, TaskReward, TaskState, TodoHistoryItem, TodoItem, TodoScope }

export interface DailyTaskTemplate {
  id: string
  title: string
  type: DailyTaskType
  target: number
  reward: TaskReward
}

export interface TasksConfig {
  dailyTemplates: DailyTaskTemplate[]
  todoReward: TaskReward
}
