import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { TrackerIcon, type TrackerIconName } from '@/components/TrackerIcon'
import { resolveSymbol } from '../symbol-registry'
import { colors, normalizeColor, radius } from '@/theme/tokens'

export interface ActivitySymbolBadgeProps {
  symbol?: string | null
  color?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  style?: StyleProp<ViewStyle>
}

const SIZE_MAP = {
  xs: { box: 20, iconSize: 12, fontSize: 11, radius: 4 },
  sm: { box: 28, iconSize: 16, fontSize: 15, radius: 6 },
  md: { box: 38, iconSize: 20, fontSize: 20, radius: radius.sm },
  lg: { box: 48, iconSize: 26, fontSize: 26, radius: radius.md },
}

export function ActivitySymbolBadge({
  symbol,
  color,
  size = 'md',
  style,
}: ActivitySymbolBadgeProps) {
  const resolved = resolveSymbol(symbol)
  const config = SIZE_MAP[size]
  const accent = normalizeColor(color, colors.coral)

  return (
    <View
      style={[
        styles.badge,
        {
          width: config.box,
          height: config.box,
          borderRadius: config.radius,
          backgroundColor: `${accent}22`,
          borderColor: `${accent}44`,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Symbol: ${resolved.label}`}
    >
      {resolved.type === 'emoji' ? (
        <Text style={[styles.emoji, { fontSize: config.fontSize }]}>
          {resolved.value}
        </Text>
      ) : (
        <TrackerIcon
          name={resolved.value as TrackerIconName}
          size={config.iconSize}
          color={accent}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
})
