export type ThemeMode = 'system' | 'dark' | 'light'
export type AccentKey = 'coral' | 'indigo' | 'emerald' | 'sky' | 'purple' | 'amber' | 'rose'

export interface AccentOption {
  key: AccentKey
  label: string
  color: string
  subtle: string
  hover: string
}

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  {
    key: 'coral',
    label: 'Tracker Coral',
    color: '#ff7557',
    subtle: 'rgba(255, 117, 87, 0.15)',
    hover: '#f9a68e',
  },
  {
    key: 'indigo',
    label: 'Indigo',
    color: '#6366f1',
    subtle: 'rgba(99, 102, 241, 0.15)',
    hover: '#4f46e5',
  },
  {
    key: 'emerald',
    label: 'Emerald',
    color: '#10b981',
    subtle: 'rgba(16, 185, 129, 0.15)',
    hover: '#059669',
  },
  {
    key: 'sky',
    label: 'Sky Blue',
    color: '#38bdf8',
    subtle: 'rgba(56, 189, 248, 0.15)',
    hover: '#0284c7',
  },
  {
    key: 'purple',
    label: 'Purple',
    color: '#8b5cf6',
    subtle: 'rgba(139, 92, 246, 0.15)',
    hover: '#7c3aed',
  },
  {
    key: 'amber',
    label: 'Amber',
    color: '#f59e0b',
    subtle: 'rgba(245, 158, 11, 0.15)',
    hover: '#d97706',
  },
  {
    key: 'rose',
    label: 'Rose',
    color: '#ec4899',
    subtle: 'rgba(236, 72, 153, 0.15)',
    hover: '#db2777',
  },
] as const

export const darkPalette = {
  background: '#090b0e',
  surface: '#14171d',
  surfaceRaised: '#1a1f27',
  border: '#272d37',
  borderMuted: '#1b2027',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  white: '#ffffff',

  // Canonical Tracker Brand
  coral: '#ff7557',
  coralSubtle: 'rgba(255, 117, 87, 0.15)',
  coralHover: '#f9a68e',

  // Core Accents
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primarySubtle: 'rgba(99, 102, 241, 0.15)',
  success: '#22c55e',
  successSubtle: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.15)',

  // Preset Palette for Habits & Badges
  emerald: '#10b981',
  emeraldSubtle: 'rgba(16, 185, 129, 0.15)',
  sky: '#38bdf8',
  skySubtle: 'rgba(56, 189, 248, 0.15)',
  purple: '#8b5cf6',
  purpleSubtle: 'rgba(139, 92, 246, 0.15)',
  amber: '#f59e0b',
  amberSubtle: 'rgba(245, 158, 11, 0.15)',
  rose: '#ec4899',
  roseSubtle: 'rgba(236, 72, 153, 0.15)',
}

export const lightPalette = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceRaised: '#f1f5f9',
  border: '#e2e8f0',
  borderMuted: '#cbd5e1',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  white: '#ffffff',

  // Canonical Tracker Brand
  coral: '#ff7557',
  coralSubtle: 'rgba(255, 117, 87, 0.15)',
  coralHover: '#e05335',

  // Core Accents
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primarySubtle: 'rgba(99, 102, 241, 0.15)',
  success: '#16a34a',
  successSubtle: 'rgba(22, 163, 74, 0.15)',
  warning: '#d97706',
  warningSubtle: 'rgba(217, 119, 6, 0.15)',
  danger: '#dc2626',
  dangerSubtle: 'rgba(220, 38, 38, 0.15)',

  // Preset Palette for Habits & Badges
  emerald: '#059669',
  emeraldSubtle: 'rgba(5, 150, 105, 0.15)',
  sky: '#0284c7',
  skySubtle: 'rgba(2, 132, 199, 0.15)',
  purple: '#7c3aed',
  purpleSubtle: 'rgba(124, 58, 237, 0.15)',
  amber: '#d97706',
  amberSubtle: 'rgba(217, 119, 6, 0.15)',
  rose: '#db2777',
  roseSubtle: 'rgba(219, 39, 119, 0.15)',
}

export type ThemeColors = typeof darkPalette

export function createThemeColors(
  mode: 'dark' | 'light',
  accentKey: AccentKey = 'coral'
): ThemeColors {
  const base = mode === 'light' ? lightPalette : darkPalette
  const accent = ACCENT_OPTIONS.find((a) => a.key === accentKey) || ACCENT_OPTIONS[0]
  return {
    ...base,
    primary: accent.color,
    primaryHover: accent.hover,
    primarySubtle: accent.subtle,
  }
}

// Canonical static colors export for backward compatibility
export const colors = darkPalette

export const paletteColors = [
  darkPalette.coral,
  darkPalette.emerald,
  darkPalette.primary,
  darkPalette.purple,
  darkPalette.warning,
  darkPalette.sky,
  darkPalette.rose,
] as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const

export const typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  md: { fontSize: 18, lineHeight: 26 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },
  hero: { fontSize: 32, lineHeight: 38 },
} as const

export const layout = {
  minTouchTarget: 48,
} as const