import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type AppTheme = 'dark' | 'light'

const STORAGE_KEY = 'app_theme_v1'

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'dark'
  }
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<AppTheme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme: AppTheme) {
        setThemeState(nextTheme)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, nextTheme)
        }
        applyTheme(nextTheme)
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
