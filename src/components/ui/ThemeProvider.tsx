import React, { createContext, useContext, useEffect, useMemo } from 'react'

void React

type ThemeMode = 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  transitioning: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const storageKey = 'vroom:theme:v2'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    localStorage.removeItem(storageKey)
  }, [])

  const value = useMemo(() => ({
    theme: 'light' as const,
    toggleTheme: () => {},
    transitioning: false,
  }), [])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

export function ThemeToggle() {
  return null
}
