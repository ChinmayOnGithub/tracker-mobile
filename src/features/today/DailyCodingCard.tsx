import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Card } from '@/components/Card'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface DailyCodingCardProps {
  platform?: 'leetcode' | 'gfg'
  date: string
}

interface ProblemData {
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  url: string
  topic?: string
}

export function DailyCodingCard({ platform = 'leetcode', date: _date }: DailyCodingCardProps) {
  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Default POTD representation for rapid instant render
    const timer = setTimeout(() => {
      setProblem({
        title: 'Daily Coding Challenge',
        difficulty: 'Medium',
        url: 'https://leetcode.com/problemset/all/',
        topic: 'Algorithms',
      })
      setLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [platform])

  const handleOpen = () => {
    if (problem?.url) {
      void Linking.openURL(problem.url).catch(() => {})
    }
  }

  const difficultyColor =
    problem?.difficulty === 'Easy'
      ? colors.emerald
      : problem?.difficulty === 'Hard'
      ? colors.danger
      : colors.amber

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityLabel="Open Daily Coding Challenge"
        onPress={handleOpen}
        style={styles.innerPressable}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <TrackerIcon name="sparkles" size="xs" color={colors.amber} />
            </View>
            <Text style={styles.title}>Problem of the Day</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : problem ? (
            <View
              style={[
                styles.diffBadge,
                { backgroundColor: `${difficultyColor}22`, borderColor: difficultyColor },
              ]}
            >
              <Text style={[styles.diffText, { color: difficultyColor }]}>
                {problem.difficulty}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bodyRow}>
          <Text numberOfLines={1} style={styles.problemTitle}>
            {problem?.title ?? 'Competitive Programming Challenge'}
          </Text>
          <TrackerIcon name="link" size="xs" color={colors.amber} />
        </View>
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  diffBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  problemTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
})
