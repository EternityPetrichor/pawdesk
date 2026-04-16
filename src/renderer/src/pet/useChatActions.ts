export function useChatActions() {
  return {
    sendChat: async (text: string) => window.pawdesk.pet.sendChat(text),
    clearBubble: async () => window.pawdesk.pet.clearBubble()
  }
}
