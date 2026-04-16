import { createDailyTasks, getDateKey } from './defaults'
import { trimTodoHistory } from './todo-store'
import type { DailyTask, DailyTaskType, TaskState } from './types'

function advanceTask(task: DailyTask): DailyTask {
  const nextProgress = Math.min(task.target, task.progress + 1)

  return {
    ...task,
    progress: nextProgress,
    completed: nextProgress >= task.target
  }
}

function carryOverTodos(taskState: TaskState, today: string): TaskState {
  return {
    ...taskState,
    todos: taskState.todos.map((todo) => {
      if (todo.scope !== 'today' || todo.completed || todo.assignedDate === today) {
        return todo
      }

      return {
        ...todo,
        assignedDate: today,
        carryoverCount: todo.carryoverCount + 1
      }
    })
  }
}

export function refreshDailyTasks(taskState: TaskState | null, now: Date = new Date()): TaskState {
  const today = getDateKey(now)

  if (!taskState) {
    return {
      lastRefreshedOn: today,
      daily: createDailyTasks(),
      todos: [],
      todoHistory: []
    }
  }

  const refreshed = trimTodoHistory(taskState, now)

  if (refreshed.lastRefreshedOn !== today) {
    return carryOverTodos(
      {
        ...refreshed,
        lastRefreshedOn: today,
        daily: createDailyTasks()
      },
      today
    )
  }

  return refreshed
}

export function updateDailyProgress(taskState: TaskState, type: DailyTaskType): TaskState {
  return {
    ...taskState,
    daily: taskState.daily.map((task) => (task.type === type && !task.completed ? advanceTask(task) : task))
  }
}

export function markDailyRewardApplied(taskState: TaskState, taskId: string): TaskState {
  return {
    ...taskState,
    daily: taskState.daily.map((task) =>
      task.id === taskId
        ? {
            ...task,
            rewardApplied: true
          }
        : task
    )
  }
}
