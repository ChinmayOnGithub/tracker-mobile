import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { ActivityTemplate } from '@/api/client'
import { Card } from '@/components/Card'
import { TrackerIcon } from '@/components/TrackerIcon'
import { ActivitySymbolBadge } from './ActivitySymbolBadge'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, typography } from '@/theme/tokens'

interface ActivityCardProps {
  template: ActivityTemplate
  onDelete: (id: string, name: string) => void
  onPress?: (template: ActivityTemplate) => void
}

export function ActivityCard({ template, onDelete, onPress }: ActivityCardProps) {
  const { colors } = useTheme()

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress?.(template)}
        style={styles.cardRow}
      >
        <ActivitySymbolBadge
          symbol={template.icon}
          color={template.color}
          size="md"
        />
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.text }]}>{template.name}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {template.category.toUpperCase()} • {template.recurrenceType.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.()
            onDelete(template.id, template.name)
          }}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${template.name}`}
          hitSlop={8}
        >
          <TrackerIcon name="trash" size="xs" color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
    fontWeight: '700',
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: spacing.xs,
  },
})
