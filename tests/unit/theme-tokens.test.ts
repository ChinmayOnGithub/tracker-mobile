import { describe, expect, it } from 'bun:test'
import { colors, layout, radius, spacing, typography } from '@/theme/tokens'

describe('Design Tokens', () => {
  it('defines valid hex/rgba values for core semantic palette', () => {
    expect(colors.background).toMatch(/^#[0-9a-f]{6}$/i)
    expect(colors.surface).toMatch(/^#[0-9a-f]{6}$/i)
    expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/i)
    expect(colors.danger).toMatch(/^#[0-9a-f]{6}$/i)
    expect(colors.success).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('guarantees touch target compliance of at least 48px', () => {
    expect(layout.minTouchTarget).toBeGreaterThanOrEqual(48)
  })

  it('defines strictly increasing spacing scale', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm)
    expect(spacing.sm).toBeLessThan(spacing.md)
    expect(spacing.md).toBeLessThan(spacing.lg)
    expect(spacing.lg).toBeLessThan(spacing.xl)
    expect(spacing.xl).toBeLessThan(spacing.xxl)
  })

  it('defines consistent radius and typography scales', () => {
    expect(radius.sm).toBeLessThan(radius.md)
    expect(radius.md).toBeLessThan(radius.lg)
    expect(typography.xs.fontSize).toBeLessThan(typography.sm.fontSize)
    expect(typography.sm.fontSize).toBeLessThan(typography.base.fontSize)
  })
})