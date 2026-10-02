import { describe, expect, it } from 'bun:test'
import {
  ACCENT_OPTIONS,
  createThemeColors,
  darkPalette,
  lightPalette,
} from '@/theme/tokens'

describe('Dynamic Theme & Color Engine', () => {
  it('defines 7 curated accent options with labels and hex colors', () => {
    expect(ACCENT_OPTIONS.length).toBe(7)
    const keys = ACCENT_OPTIONS.map((a) => a.key)
    expect(keys).toContain('coral')
    expect(keys).toContain('indigo')
    expect(keys).toContain('emerald')
    expect(keys).toContain('sky')
    expect(keys).toContain('purple')
    expect(keys).toContain('amber')
    expect(keys).toContain('rose')

    for (const opt of ACCENT_OPTIONS) {
      expect(opt.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(opt.subtle).toContain('rgba(')
      expect(opt.hover).toMatch(/^#[0-9a-f]{6}$/i)
      expect(opt.label.length).toBeGreaterThan(2)
    }
  })

  it('generates dark theme colors with requested accent', () => {
    const emeraldDark = createThemeColors('dark', 'emerald')
    expect(emeraldDark.background).toBe(darkPalette.background)
    expect(emeraldDark.surface).toBe(darkPalette.surface)
    expect(emeraldDark.text).toBe(darkPalette.text)
    expect(emeraldDark.primary).toBe('#10b981')
    expect(emeraldDark.primarySubtle).toContain('rgba(16, 185, 129')
  })

  it('generates light theme colors with requested accent', () => {
    const skyLight = createThemeColors('light', 'sky')
    expect(skyLight.background).toBe(lightPalette.background)
    expect(skyLight.surface).toBe(lightPalette.surface)
    expect(skyLight.text).toBe(lightPalette.text)
    expect(skyLight.primary).toBe('#38bdf8')
  })

  it('falls back to coral accent if an unknown key is provided', () => {
    // @ts-expect-error Testing fallback behavior
    const fallback = createThemeColors('dark', 'unknown_accent')
    expect(fallback.primary).toBe('#ff7557')
  })

  it('maintains distinct surface and background colors in both dark and light modes', () => {
    expect(darkPalette.background).not.toBe(darkPalette.surface)
    expect(lightPalette.background).not.toBe(lightPalette.surface)
    expect(darkPalette.text).not.toBe(lightPalette.text)
  })
})
