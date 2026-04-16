import type { TodoScope } from '../../../shared/types/pet'

export function useTaskActions() {
  return {
    addTodo: async (title: string, scope: TodoScope) => window.pawdesk.pet.addTodo(title, scope),
    toggleTodo: async (todoId: string) => window.pawdesk.pet.toggleTodo(todoId),
    removeTodo: async (todoId: string) => window.pawdesk.pet.removeTodo(todoId)
  }
}
