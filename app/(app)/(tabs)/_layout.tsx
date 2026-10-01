import { Tabs } from 'expo-router'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors } from '@/theme/tokens'

export default function TabsLayout() {
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