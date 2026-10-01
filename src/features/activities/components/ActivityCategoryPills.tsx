import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface ActivityCategoryPillsProps {
  categories: string[]
  selectedCategory: string
  onSelectCategory: (category: string) => void
}

export function ActivityCategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
}: ActivityCategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryScroll}
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelectCategory(cat)}
            style={[
              styles.categoryPill,
              isSelected && styles.categoryPillActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${cat}`}
          >
            <Text
              style={[
                styles.categoryPillText,
                isSelected && styles.categoryPillTextActive,
              ]}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  categoryScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: colors.white,
  },
})
