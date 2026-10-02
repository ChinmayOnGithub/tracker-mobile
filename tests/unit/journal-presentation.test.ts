import { describe, expect, it } from 'bun:test'
import {
  countChars,
  countWords,
  getMoodDetails,
  prepareJournalPayload,
  JOURNAL_MOODS,
} from '@/features/journal/journal-presentation'

describe('Journal Presentation & Payload Logic', () => {
  it('accurately counts words and characters across formatted text', () => {
    expect(countWords('')).toBe(0)
    expect(countChars('')).toBe(0)

    const text = 'Today was a very productive day with many accomplishments.'
    expect(countWords(text)).toBe(9)
    expect(countChars(text)).toBe(58)

    const htmlText = '<p>Deep work <strong>session</strong> done!</p>'
    expect(countWords(htmlText)).toBe(4)
  })

  it('retrieves correct mood details including color and emoji', () => {
    const great = getMoodDetails('great')
    expect(great).toBeDefined()
    expect(great?.label).toBe('Great')
    expect(great?.emoji).toBe('😄')

    const tough = getMoodDetails('tough')
    expect(tough).toBeDefined()
    expect(tough?.label).toBe('Tough')
    expect(tough?.emoji).toBe('😫')

    expect(getMoodDetails(null)).toBeUndefined()
    expect(getMoodDetails('nonexistent')).toBeUndefined()
  })

  it('prepares and trims journal payload cleanly converting empty strings to null', () => {
    const payload = prepareJournalPayload({
      content: 'Reflecting on system architecture',
      mood: 'good',
      gratitude: '   Grateful for family   ',
      reflections: '',
      lessonsLearned: '   ',
      tomorrowPlan: 'Ship release v1.0',
    })

    expect(payload.content).toBe('Reflecting on system architecture')
    expect(payload.mood).toBe('good')
    expect(payload.gratitude).toBe('Grateful for family')
    expect(payload.reflections).toBeNull()
    expect(payload.lessonsLearned).toBeNull()
    expect(payload.tomorrowPlan).toBe('Ship release v1.0')
  })

  it('has 5 canonical mood options defined', () => {
    expect(JOURNAL_MOODS).toHaveLength(5)
    expect(JOURNAL_MOODS.map((m) => m.value)).toEqual([
      'great',
      'good',
      'okay',
      'low',
      'tough',
    ])
  })
})
