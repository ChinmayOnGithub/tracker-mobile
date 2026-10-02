import { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors } from '@/theme/tokens'
import { prefetchAppData } from '@/utils/prefetch'

export default function TabsLayout() {
  const db = useSQLiteContext()

  useEffect(() => {
    void prefetchAppData(db)
  }, [db])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#ff7557', // Canonical Tracker coral
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="home" size="sm" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarAccessibilityLabel: 'Calendar tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="calendar" size="sm" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarAccessibilityLabel: 'Activities tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="activity" size="sm" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarAccessibilityLabel: 'Journal tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="journal" size="sm" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarAccessibilityLabel: 'Notes tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="notes" size="sm" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color }) => (
            <TrackerIcon name="settings" size="sm" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}