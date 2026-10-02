import { CalendarScreen } from '@/features/calendar/CalendarScreen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function CalendarRoute() {
  return (
    <ErrorBoundary fallbackTitle="Calendar Error">
      <CalendarScreen />
    </ErrorBoundary>
  )
}
