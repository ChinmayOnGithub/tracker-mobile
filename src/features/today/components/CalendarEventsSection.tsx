import React from 'react'
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { LocalCalendarEvent } from '@/db/repository'
import { TrackerIcon } from '@/components/TrackerIcon'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'

interface CalendarEventsSectionProps {
  events: LocalCalendarEvent[]
}

export function CalendarEventsSection({ events }: CalendarEventsSectionProps) {
  const { colors } = useTheme()
  
  if (events.length === 0) return null

  const handleOpenLink = (url?: string | null) => {
    if (url) {
      void Linking.openURL(url).catch(() => {
        // Ignore open url failures
      })
    }
  }

  const styles = React.useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TrackerIcon name="calendar" size="xs" color={colors.sky} />
          <Text style={styles.title}>Calendar Events</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{events.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        {events.map((event, index) => {
          let timeLabel = 'All Day'
          if (!event.allDay && event.startDate) {
            const start = new Date(event.startDate)
            const end = event.endDate ? new Date(event.endDate) : null
            const startStr = start.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
            if (end) {
              const endStr = end.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
              timeLabel = `${startStr} – ${endStr}`
            } else {
              timeLabel = startStr
            }
          }

          const isLast = index === events.length - 1

          return (
            <Pressable
              key={event.id}
              accessibilityLabel={`Calendar event ${event.title}`}
              disabled={!event.googleEventId}
              onPress={() => {
                if (event.googleEventId) {
                  handleOpenLink(
                    `https://calendar.google.com/calendar/r/eventedit/${event.googleEventId}`
                  )
                }
              }}
              style={[styles.eventRow, !isLast && styles.eventRowBorder]}
            >
              {/* Left Accent Bar */}
              <View
                style={[
                  styles.accentBar,
                  { backgroundColor: event.color || colors.sky },
                ]}
              />

              <View style={styles.contentCol}>
                <Text numberOfLines={1} style={styles.eventTitle}>
                  {event.title}
                </Text>

                <View style={styles.metaRow}>
                  <TrackerIcon name="clock" size={10} color={colors.textMuted} />
                  <Text style={styles.timeText}>{timeLabel}</Text>

                  {event.location ? (
                    <Text numberOfLines={1} style={styles.locationText}>
                      • {event.location}
                    </Text>
                  ) : null}
                </View>
              </View>

              {event.googleEventId ? (
                <TrackerIcon
                  name="link"
                  size="xs"
                  color={colors.textSubtle}
                />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  title: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.skySubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.sky,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    position: 'relative',
    gap: spacing.sm,
  },
  eventRowBorder: {
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: 1,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
  },
  contentCol: {
    flex: 1,
    marginLeft: spacing.xs,
    gap: 2,
  },
  eventTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSubtle,
    flexShrink: 1,
  },
})