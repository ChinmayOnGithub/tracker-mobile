import type { TrackerIconName } from '@/components/TrackerIcon'

export type SymbolType = 'emoji' | 'wireframe'

export interface ActivitySymbol {
  id: string
  type: SymbolType
  value: string // Emoji string or TrackerIconName
  label: string
  isPro: boolean
}

// Free tier gets 6 core emojis and 6 core wireframe icons
export const FREE_SYMBOLS: readonly ActivitySymbol[] = [
  // Free Emojis (Everyday essentials)
  { id: 'emoji:running', type: 'emoji', value: '🏃', label: 'Workout', isPro: false },
  { id: 'emoji:laptop', type: 'emoji', value: '💻', label: 'Coding & Work', isPro: false },
  { id: 'emoji:books', type: 'emoji', value: '📚', label: 'Reading', isPro: false },
  { id: 'emoji:water', type: 'emoji', value: '💧', label: 'Hydration', isPro: false },
  { id: 'emoji:meditate', type: 'emoji', value: '🧘', label: 'Mindfulness', isPro: false },
  { id: 'emoji:apple', type: 'emoji', value: '🍎', label: 'Nutrition', isPro: false },

  // Free Wireframes (Core productivity)
  { id: 'icon:activity', type: 'wireframe', value: 'activity', label: 'Activity', isPro: false },
  { id: 'icon:briefcase', type: 'wireframe', value: 'briefcase', label: 'Work', isPro: false },
  { id: 'icon:book-open', type: 'wireframe', value: 'book-open', label: 'Study', isPro: false },
  { id: 'icon:weight', type: 'wireframe', value: 'weight', label: 'Health', isPro: false },
  { id: 'icon:clock', type: 'wireframe', value: 'clock', label: 'Time', isPro: false },
  { id: 'icon:check', type: 'wireframe', value: 'check', label: 'Task', isPro: false },
] as const

// Pro tier gets extended collection of emojis and wireframe symbols
export const PRO_SYMBOLS: readonly ActivitySymbol[] = [
  // Pro Emojis
  { id: 'emoji:bolt', type: 'emoji', value: '⚡', label: 'High Energy', isPro: true },
  { id: 'emoji:target', type: 'emoji', value: '🎯', label: 'Goals', isPro: true },
  { id: 'emoji:gym', type: 'emoji', value: '🏋️', label: 'Heavy Lifting', isPro: true },
  { id: 'emoji:art', type: 'emoji', value: '🎨', label: 'Creative', isPro: true },
  { id: 'emoji:write', type: 'emoji', value: '✍️', label: 'Writing', isPro: true },
  { id: 'emoji:sleep', type: 'emoji', value: '🛌', label: 'Recovery', isPro: true },
  { id: 'emoji:bike', type: 'emoji', value: '🚲', label: 'Cycling', isPro: true },
  { id: 'emoji:meds', type: 'emoji', value: '💊', label: 'Supplements', isPro: true },
  { id: 'emoji:coffee', type: 'emoji', value: '☕', label: 'Routine', isPro: true },
  { id: 'emoji:brain', type: 'emoji', value: '🧠', label: 'Deep Work', isPro: true },
  { id: 'emoji:nature', type: 'emoji', value: '🌿', label: 'Outdoors', isPro: true },
  { id: 'emoji:rocket', type: 'emoji', value: '🚀', label: 'Sprint', isPro: true },

  // Pro Wireframes
  { id: 'icon:sparkles', type: 'wireframe', value: 'sparkles', label: 'Magic Habit', isPro: true },
  { id: 'icon:flame', type: 'wireframe', value: 'flame', label: 'Streak', isPro: true },
  { id: 'icon:target', type: 'wireframe', value: 'target', label: 'Precision', isPro: true },
  { id: 'icon:zap', type: 'wireframe', value: 'zap', label: 'Sprint', isPro: true },
  { id: 'icon:heart', type: 'wireframe', value: 'heart', label: 'Cardio', isPro: true },
  { id: 'icon:coffee', type: 'wireframe', value: 'coffee', label: 'Coffee', isPro: true },
  { id: 'icon:code', type: 'wireframe', value: 'code', label: 'Engineering', isPro: true },
  { id: 'icon:dumbbell', type: 'wireframe', value: 'dumbbell', label: 'Strength', isPro: true },
  { id: 'icon:moon', type: 'wireframe', value: 'moon', label: 'Evening', isPro: true },
  { id: 'icon:sun', type: 'wireframe', value: 'sun', label: 'Morning', isPro: true },
  { id: 'icon:trophy', type: 'wireframe', value: 'trophy', label: 'Milestone', isPro: true },
  { id: 'icon:crown', type: 'wireframe', value: 'crown', label: 'Priority', isPro: true },
] as const

export const ALL_SYMBOLS: readonly ActivitySymbol[] = [...FREE_SYMBOLS, ...PRO_SYMBOLS]

const EMOJI_REGEX = /\p{Extended_Pictographic}/u

export function isSymbolLocked(symbol: ActivitySymbol, isPro: boolean): boolean {
  return symbol.isPro && !isPro
}

export function getSymbolById(id: string): ActivitySymbol | undefined {
  return ALL_SYMBOLS.find((s) => s.id === id)
}

export function resolveSymbol(iconValue?: string | null): ActivitySymbol {
  if (!iconValue) {
    return FREE_SYMBOLS.find((s) => s.id === 'icon:activity')!
  }

  // Exact ID match
  const byId = ALL_SYMBOLS.find((s) => s.id === iconValue)
  if (byId) return byId

  // Exact value match
  const byValue = ALL_SYMBOLS.find((s) => s.value === iconValue)
  if (byValue) return byValue

  // Check if string contains emoji
  if (EMOJI_REGEX.test(iconValue)) {
    return {
      id: `custom:${iconValue}`,
      type: 'emoji',
      value: iconValue,
      label: 'Custom Emoji',
      isPro: true,
    }
  }

  // Fallback to wireframe icon if known, else default
  return {
    id: `custom:${iconValue}`,
    type: 'wireframe',
    value: iconValue as TrackerIconName,
    label: iconValue,
    isPro: false,
  }
}
