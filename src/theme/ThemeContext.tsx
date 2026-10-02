import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import {
  AccentKey,
  ACCENT_OPTIONS,
  createThemeColors,
  darkPalette,
  ThemeColors,
  ThemeMode,
} from './tokens'

const THEME_MODE_KEY = 'tracker.theme.mode'
const ACCENT_KEY = 'tracker.theme.accent'

export interface ThemeContextValue {
  mode: ThemeMode
  resolvedMode: 'dark' | 'light'
  accent: AccentKey
  colors: ThemeColors
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: AccentKey) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolvedMode: 'dark',
  accent: 'coral',
  colors: darkPalette,
  isDark: true,
  setMode: () => {},
  setAccent: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme?.() ?? 'dark'
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [accent, setAccentState] = useState<AccentKey>('coral')

  useEffect(() => {
    let active = true
    async function loadPreferences() {
      try {
        const savedMode = await SecureStore.getItemAsync(THEME_MODE_KEY)
        if (active && (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system')) {
          setModeState(savedMode)
        }
        const savedAccent = await SecureStore.getItemAsync(ACCENT_KEY)
        if (
          active &&
          savedAccent &&
          ACCENT_OPTIONS.some((opt) => opt.key === savedAccent)
        ) {
          setAccentState(savedAccent as AccentKey)
        }
      } catch {
        // Fallback for non-native or test environments
      }
    }
    void loadPreferences()
    return () => {
      active = false
    }
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    SecureStore.setItemAsync(THEME_MODE_KEY, newMode).catch(() => {})
  }

  const setAccent = (newAccent: AccentKey) => {
    setAccentState(newAccent)
    SecureStore.setItemAsync(ACCENT_KEY, newAccent).catch(() => {})
  }

  const resolvedMode: 'dark' | 'light' =
    mode === 'system' ? (systemColorScheme === 'light' ? 'light' : 'dark') : mode

  const colors = createThemeColors(resolvedMode, accent)
  const isDark = resolvedMode === 'dark'

  return (
    <ThemeContext.Provider
      value={{
        mode,
        resolvedMode,
        accent,
        colors,
        isDark,
        setMode,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
