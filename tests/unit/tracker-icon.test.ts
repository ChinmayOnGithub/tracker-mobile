import { describe, expect, it, mock } from 'bun:test'
import type { TrackerIconName } from '@/components/TrackerIcon'

mock.module('react-native', () => ({
  Platform: { OS: 'android' },
  StyleSheet: { create: (s: unknown) => s },
}))

mock.module('react-native-svg', () => {
  const Dummy = (props: unknown) => ({ type: 'svg', props })
  return {
    default: Dummy,
    Svg: Dummy,
    Path: Dummy,
    Circle: Dummy,
    Rect: Dummy,
    Line: Dummy,
    Polyline: Dummy,
    Polygon: Dummy,
  }
})

const { TrackerIcon } = await import('@/components/TrackerIcon')

describe('TrackerIcon Semantic Registry', () => {
  const semanticNames: TrackerIconName[] = [
    'home',
    'calendar',
    'activity',
    'work',
    'briefcase',
    'weight',
    'journal',
    'book-open',
    'notes',
    'sticky-note',
    'link',
    'vault',
    'trash',
    'delete',
    'settings',
    'search',
    'plus',
    'edit',
    'restore',
    'check',
    'x',
    'close',
    'chevron-left',
    'chevron-right',
    'more-horizontal',
    'filter',
    'sort',
    'upload',
    'download',
    'lock',
    'unlock',
    'eye',
    'eye-off',
    'clock',
    'sparkles',
    'refresh',
    'user',
    'logout',
  ]

  it('maps every semantic icon name without returning null or throwing', () => {
    for (const name of semanticNames) {
      const rendered = TrackerIcon({ name })
      expect(rendered).not.toBeNull()
      expect(rendered?.type).toBeDefined()
    }
  })

  it('resolves semantic size presets and custom numeric sizes', () => {
    const iconSm = TrackerIcon({ name: 'calendar', size: 'sm' })
    const iconLg = TrackerIcon({ name: 'calendar', size: 'lg' })
    const iconCustom = TrackerIcon({ name: 'calendar', size: 40 })

    expect(iconSm?.props.size).toBe(18)
    expect(iconLg?.props.size).toBe(26)
    expect(iconCustom?.props.size).toBe(40)
  })

  it('applies disabled color when disabled prop is true', () => {
    const active = TrackerIcon({ name: 'trash', color: '#ff7557' })
    const disabled = TrackerIcon({ name: 'trash', color: '#ff7557', disabled: true })

    expect(active?.props.color).toBe('#ff7557')
    expect(disabled?.props.color).not.toBe('#ff7557')
  })
})
