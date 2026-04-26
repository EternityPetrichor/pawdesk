export function sanitizeProviderReply(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```think[\s\S]*?```/gi, '')
    .trim()
}
