import React, { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { TrackerIcon, type TrackerIconName } from '@/components/TrackerIcon'
import {
  ALL_SYMBOLS,
  ActivitySymbol,
  isSymbolLocked,
  resolveSymbol,
} from '../symbol-registry'
import { useEntitlements } from '@/auth/EntitlementProvider'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing, typography } from '@/theme/tokens'

interface SymbolPickerProps {
  selectedSymbol?: string | null
  color?: string | null
  onSelect: (symbol: ActivitySymbol) => void
}

type FilterCategory = 'all' | 'free' | 'pro' | 'emoji' | 'wireframe'

export function SymbolPicker({
  selectedSymbol,
  color,
  onSelect,
}: SymbolPickerProps) {
  const { colors } = useTheme()
  const { isPro, requirePro } = useEntitlements()
  const [filter, setFilter] = useState<FilterCategory>('all')

  const currentResolved = resolveSymbol(selectedSymbol)
  const accent = color || colors.coral

  const filteredSymbols = ALL_SYMBOLS.filter((s) => {
    if (filter === 'free') return !s.isPro
    if (filter === 'pro') return s.isPro
    if (filter === 'emoji') return s.type === 'emoji'
    if (filter === 'wireframe') return s.type === 'wireframe'
    return true
  })

  const handlePressSymbol = (symbol: ActivitySymbol) => {
    if (isSymbolLocked(symbol, isPro)) {
      requirePro(`"${symbol.label}" Symbol`)
      return
    }
    onSelect(symbol)
  }

  return (
    <View style={styles.container}>
      {/* Active Symbol Display */}
      <View style={[styles.activePreview, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <View
          style={[
            styles.previewIconBox,
            { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
          ]}
        >
          {currentResolved.type === 'emoji' ? (
            <Text style={styles.previewEmoji}>{currentResolved.value}</Text>
          ) : (
            <TrackerIcon
              name={currentResolved.value as TrackerIconName}
              size={24}
              color={accent}
            />
          )}
        </View>
        <View style={styles.previewCopy}>
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            {currentResolved.label}
          </Text>
          <Text style={[styles.previewSub, { color: colors.textMuted }]}>
            {currentResolved.type === 'emoji' ? 'Emoji Symbol' : 'Wireframe Icon'} •{' '}
            {currentResolved.isPro ? 'Pro Tier ⚡' : 'Free Tier'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'free', 'pro', 'emoji', 'wireframe'] as FilterCategory[]).map((cat) => {
          const isActive = filter === cat
          const label =
            cat === 'all'
              ? 'All'
              : cat === 'free'
              ? 'Free'
              : cat === 'pro'
              ? 'Pro ⚡'
              : cat === 'emoji'
              ? 'Emojis'
              : 'Icons'

          return (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${label}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textMuted },
                  isActive && { color: colors.white, fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Symbol Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollGrid}
      >
        {filteredSymbols.map((item) => {
          const isSelected =
            currentResolved.id === item.id || currentResolved.value === item.value
          const locked = isSymbolLocked(item, isPro)

          return (
            <Pressable
              key={item.id}
              onPress={() => handlePressSymbol(item)}
              style={[
                styles.symbolItem,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, backgroundColor: `${colors.primary}18`, borderWidth: 2 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} (${item.isPro ? 'Pro' : 'Free'})`}
            >
              {item.type === 'emoji' ? (
                <Text style={styles.gridEmoji}>{item.value}</Text>
              ) : (
                <TrackerIcon
                  name={item.value as TrackerIconName}
                  size={20}
                  color={isSelected ? colors.primary : colors.text}
                />
              )}

              {/* Locked / Crown Badge */}
              {locked ? (
                <View style={styles.proBadge}>
                  <TrackerIcon name="crown" size={10} color={colors.warning} />
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  activePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 22,
    textAlign: 'center',
  },
  previewCopy: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
  },
  previewSub: {
    fontSize: typography.xs.fontSize,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 6,
  },
  symbolItem: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridEmoji: {
    fontSize: 20,
    textAlign: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 1,
    right: 2,
  },
})
