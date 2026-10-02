import { JournalScreen } from '@/features/journal/JournalScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function JournalRoute() {
  return (
    <ErrorBoundary fallbackTitle="Journal Error">
      <JournalScreen />
    </ErrorBoundary>
  )
}
