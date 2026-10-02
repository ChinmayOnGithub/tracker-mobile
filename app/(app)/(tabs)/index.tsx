import { TodayScreen } from '@/features/today/TodayScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function TodayRoute() {
  return (
    <ErrorBoundary fallbackTitle="Today Screen Error">
      <TodayScreen />
    </ErrorBoundary>
  )
}