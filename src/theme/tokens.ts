export const colors = {
  background: '#090b0e',
  surface: '#14171d',
  surfaceRaised: '#1a1f27',
  border: '#272d37',
  borderMuted: '#1b2027',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primarySubtle: 'rgba(99, 102, 241, 0.15)',
  success: '#22c55e',
  successSubtle: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.15)',
} as const

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