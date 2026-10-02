import type { ReactNode } from 'react'

import { DailyCodingCard } from './DailyCodingCard'
import { JournalWidgetCard } from './JournalWidgetCard'
import { LeaveWidgetCard } from './LeaveWidgetCard'
import { WeightWidgetCard } from './WeightWidgetCard'
import { WorkSessionCard } from './WorkSessionCard'

export type TodayWidgetId =
  | 'work-session'
  | 'leave'
  | 'journal'
  | 'daily-coding'
  | 'weight'

export interface TodayWidgetContext {
  date: string
  onChanged: () => void
}

export interface TodayWidgetDefinition {
  id: TodayWidgetId
  title: string
  render: (context: TodayWidgetContext) => ReactNode
}

/**
 * Single registry for in-app Today widgets.
 *
 * Keep domain logic inside each widget. This registry owns ordering and
 * composition only, so adding/reordering widgets does not grow TodayScreen.
 */
export const TODAY_WIDGETS: readonly TodayWidgetDefinition[] = [
  {
    id: 'work-session',
    title: 'Work session',
    render: ({ date }) => <WorkSessionCard date={date} />,
  },
  {
    id: 'leave',
    title: 'Leave',
    render: ({ date, onChanged }) => (
      <LeaveWidgetCard selectedDate={date} onLeaveChanged={onChanged} />
    ),
  },
  {
    id: 'journal',
    title: 'Journal',
    render: ({ date }) => <JournalWidgetCard date={date} />,
  },
  {
    id: 'daily-coding',
    title: 'Daily coding',
    render: ({ date }) => <DailyCodingCard date={date} />,
  },
  {
    id: 'weight',
    title: 'Weight',
    render: ({ date }) => <WeightWidgetCard date={date} />,
  },
]
