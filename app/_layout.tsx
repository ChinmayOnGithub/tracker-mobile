import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/auth/AuthProvider'
import { migrateDatabase } from '@/db/migrations'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SQLiteProvider databaseName="tracker.db" onInit={migrateDatabase}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  )
}