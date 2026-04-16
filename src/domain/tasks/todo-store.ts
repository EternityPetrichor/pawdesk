import { getDateKey } from './defaults'
import type { TaskState, TodoHistoryItem, TodoItem, TodoScope } from './types'

const historyRetentionDays = 30

function createTodoId(): string {
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTodo(todo: TodoItem, fallbackDate: string): TodoItem {
  return {
    ...todo,
    scope: todo.scope ?? 'today',
    assignedDate: todo.assignedDate ?? getDateKey(new Date(todo.createdAt || fallbackDate)),
    carryoverCount: todo.carryoverCount ?? 0
  }
}

function normalizeTaskState(taskState: TaskState, now: Date): TaskState {
  const today = getDateKey(now)

  return {
    ...taskState,
    todos: taskState.todos.map((todo) => normalizeTodo(todo, today)),
    todoHistory: taskState.todoHistory ?? []
  }
}

function trimHistory(history: TodoHistoryItem[], now: Date): TodoHistoryItem[] {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - historyRetentionDays)

  return history
    .filter((item) => new Date(item.completedAt) >= cutoff)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
}

function toHistoryItem(todo: TodoItem, now: Date): TodoHistoryItem {
  const completedAt = now.toISOString()

  return {
    id: todo.id,
    title: todo.title,
    scope: todo.scope,
    createdAt: todo.createdAt,
    completedAt,
    completedDate: getDateKey(now),
    carryoverCount: todo.carryoverCount
  }
}

export function addTodo(taskState: TaskState, title: string, scope: TodoScope = 'today', now: Date = new Date()): TaskState {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return taskState
  }

  const normalized = normalizeTaskState(taskState, now)
  const nextTodo: TodoItem = {
    id: createTodoId(),
    title: trimmedTitle,
    completed: false,
    createdAt: now.toISOString(),
    completedAt: null,
    scope,
    assignedDate: getDateKey(now),
    carryoverCount: 0
  }

  return {
    ...normalized,
    todos: [nextTodo, ...normalized.todos]
  }
}

export function toggleTodo(taskState: TaskState, todoId: string, now: Date = new Date()): TaskState {
  const normalized = normalizeTaskState(taskState, now)
  const targetTodo = normalized.todos.find((todo) => todo.id === todoId)

  if (!targetTodo) {
    return normalized
  }

  const nextCompleted = !targetTodo.completed
  const nextTodos = normalized.todos.map((todo) =>
    todo.id === todoId
      ? {
          ...todo,
          completed: nextCompleted,
          completedAt: nextCompleted ? now.toISOString() : null
        }
      : todo
  )

  const nextHistory = nextCompleted
    ? trimHistory([toHistoryItem(targetTodo, now), ...normalized.todoHistory.filter((item) => item.id !== todoId)], now)
    : normalized.todoHistory.filter((item) => item.id !== todoId)

  return {
    ...normalized,
    todos: nextTodos,
    todoHistory: nextHistory
  }
}

export function removeTodo(taskState: TaskState, todoId: string, now: Date = new Date()): TaskState {
  const normalized = normalizeTaskState(taskState, now)

  return {
    ...normalized,
    todos: normalized.todos.filter((todo) => todo.id !== todoId)
  }
}

export function trimTodoHistory(taskState: TaskState, now: Date = new Date()): TaskState {
  const normalized = normalizeTaskState(taskState, now)

  return {
    ...normalized,
    todoHistory: trimHistory(normalized.todoHistory, now)
  }
}
