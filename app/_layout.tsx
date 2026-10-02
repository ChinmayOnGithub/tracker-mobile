import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthProvider'
import { EntitlementProvider } from '@/auth/EntitlementProvider'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'
import { migrateDatabase } from '@/db/migrations'

function ThemedStatusBar() {
  const { isDark } = useTheme()
  return <StatusBar style={isDark ? 'light' : 'dark'} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <SQLiteProvider databaseName="tracker.db" onInit={migrateDatabase}>
          <AuthProvider>
            <EntitlementProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </EntitlementProvider>
          </AuthProvider>
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}