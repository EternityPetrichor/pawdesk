import { useEffect, useState } from 'react'
import type { PetSnapshot } from '../../../shared/types/pet'
import { getDateKey } from '../../../domain/tasks/defaults'

const now = new Date()
const today = getDateKey(now)

const browserFallbackSnapshot: PetSnapshot = {
  identity: {
    name: '小爪',
    createdAt: now.toISOString()
  },
  stats: {
    mood: 72,
    energy: 78,
    hunger: 42,
    intimacy: 18,
    lastUpdatedAt: now.toISOString()
  },
  position: {
    x: 0,
    y: 0
  },
  derived: {
    animationState: 'idle',
    moodLabel: '平静',
    statusText: '当前是浏览器预览模式',
    isSleeping: false
  },
  tasks: {
    lastRefreshedOn: today,
    daily: [],
    todos: [],
    todoHistory: [],
    summary: {
      completedDailyCount: 0,
      totalDailyCount: 0,
      completedTodoCount: 0,
      totalTodoCount: 0
    }
  },
  chat: {
    currentBubble: {
      text: '这是浏览器预览模式，真实桌宠能力要在 Electron 里看。',
      createdAt: now.toISOString(),
      scenario: 'greeting'
    },
    messages: [],
    cooldowns: {
      lastIdleRemarkAt: null
    }
  },
  modelConfig: {
    enabled: true,
    mode: 'local-template',
    provider: 'local-template',
    model: 'template-v1',
    baseUrl: '',
    hasApiKey: false
  },
  workMode: {
    enabled: false,
    tool: 'claude-code',
    status: 'disabled',
    lastEvent: null,
    connection: 'idle',
    summary: {
      errorCount: 0,
      recentFiles: [],
      lastCompletedAt: null,
      lastActiveAt: null
    },
    server: {
      port: null
    }
  }
}

export function usePetSnapshot(): PetSnapshot | null {
  const [snapshot, setSnapshot] = useState<PetSnapshot | null>(null)

  useEffect(() => {
    if (!window.pawdesk?.pet) {
      setSnapshot(browserFallbackSnapshot)
      return
    }

    void window.pawdesk.pet.getSnapshot().then((nextSnapshot) => {
      setSnapshot(nextSnapshot)
    })

    return window.pawdesk.pet.onSnapshotChange((nextSnapshot) => {
      setSnapshot(nextSnapshot)
    })
  }, [])

  return snapshot
}
