import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useAuth } from '@/auth/AuthProvider'
import { colors } from '@/theme/tokens'

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
})