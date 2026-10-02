import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { trackerApi, type JournalEntry } from '@/api/client'
import { Card } from '@/components/Card'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface JournalWidgetCardProps {
  date: string
}

const MOOD_EMOJIS: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: '😄', label: 'Great', color: colors.emerald },
  good: { emoji: '🙂', label: 'Good', color: colors.sky },
  okay: { emoji: '😐', label: 'Okay', color: colors.purple },
  low: { emoji: '😔', label: 'Low', color: colors.amber },
  tough: { emoji: '😫', label: 'Tough', color: colors.danger },
}

export function JournalWidgetCard({ date }: JournalWidgetCardProps) {
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true
    setLoading(true)

    trackerApi
      .getJournalEntry(date)
      .then((res) => {
        if (isCurrent) {
          setEntry(res.entry)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setEntry(null)
          setLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [date])

  const moodInfo = entry?.mood ? MOOD_EMOJIS[entry.mood.toLowerCase()] : null
  const snippet =
    entry?.content?.trim() ||
    entry?.gratitude?.trim() ||
    entry?.tomorrowPlan?.trim() ||
    null

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityLabel="Open Journal"
        onPress={() => router.push('/(app)/(tabs)/journal')}
        style={styles.innerPressable}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <TrackerIcon name="journal" size="xs" color={colors.purple} />
            </View>
            <Text style={styles.title}>Daily Reflection</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : moodInfo ? (
            <View
              style={[
                styles.moodBadge,
                { backgroundColor: `${moodInfo.color}22`, borderColor: moodInfo.color },
              ]}
            >
              <Text style={styles.moodEmoji}>{moodInfo.emoji}</Text>
              <Text style={[styles.moodLabel, { color: moodInfo.color }]}>
                {moodInfo.label}
              </Text>
            </View>
          ) : (
            <View style={styles.actionPrompt}>
              <Text style={styles.actionPromptText}>Write</Text>
              <TrackerIcon name="chevron-right" size={12} color={colors.purple} />
            </View>
          )}
        </View>

        {snippet ? (
          <Text numberOfLines={2} style={styles.snippetText}>
            “{snippet}”
          </Text>
        ) : (
          <Text style={styles.emptyText}>
            Capture what went well today, lessons learned, or daily gratitude.
          </Text>
        )}
      </Pressable>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  innerPressable: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 12,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.purple,
  },
  snippetText: {
    fontSize: typography.sm.fontSize,
    lineHeight: 20,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: typography.xs.fontSize,
    lineHeight: 18,
    color: colors.textSubtle,
  },
})
