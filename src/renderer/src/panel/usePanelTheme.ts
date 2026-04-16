import { useEffect, useState } from 'react'
import { defaultPanelTheme, isPanelThemeId, type PanelThemeId } from './panel-theme'

const storageKey = 'pawdesk.panel.theme'

function readStoredPanelTheme(): PanelThemeId {
  if (typeof window === 'undefined') {
    return defaultPanelTheme
  }

  const storedTheme = window.localStorage.getItem(storageKey)
  if (storedTheme && isPanelThemeId(storedTheme)) {
    return storedTheme
  }

  return defaultPanelTheme
}

export function usePanelTheme() {
  const [theme, setTheme] = useState<PanelThemeId>(readStoredPanelTheme)

  useEffect(() => {
    window.localStorage.setItem(storageKey, theme)
  }, [theme])

  return {
    theme,
    setTheme
  }
}
