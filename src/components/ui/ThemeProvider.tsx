import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons'
import { createHugeIcon } from './HugeIcon'
import { cn } from '../../lib/utils'

void React

type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  transitioning: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const storageKey = 'vroom:theme:v2'
const Moon = createHugeIcon(Moon02Icon)
const Sun = createHugeIcon(Sun03Icon)

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(storageKey)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(storageKey, theme)
  }, [theme])

  function toggleTheme() {
    setTransitioning(true)
    setTheme((current) => current === 'light' ? 'dark' : 'light')
    window.setTimeout(() => setTransitioning(false), 760)
  }

  const value = useMemo(() => ({ theme, toggleTheme, transitioning }), [theme, transitioning])

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <div className={cn('theme-ripple', transitioning && 'active')} aria-hidden="true" />
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={cn('theme-toggle', compact && 'theme-toggle-compact')}
      onClick={toggleTheme}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
        <Sun size={16} className="theme-toggle-sun" />
        <Moon size={16} className="theme-toggle-moon" />
      </span>
    </button>
  )
}
