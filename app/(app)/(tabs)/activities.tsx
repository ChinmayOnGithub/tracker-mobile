import { ActivitiesScreen } from '@/features/activities/ActivitiesScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function ActivitiesRoute() {
  return (
    <ErrorBoundary fallbackTitle="Activities Error">
      <ActivitiesScreen />
    </ErrorBoundary>
  )
}