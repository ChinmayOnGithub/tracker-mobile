import { WorkScreen } from '@/features/work/WorkScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function WorkRoute() {
  return (
    <ErrorBoundary fallbackTitle="Work Tracker Error">
      <WorkScreen />
    </ErrorBoundary>
  )
}
