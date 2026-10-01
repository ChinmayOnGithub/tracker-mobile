import { describe, expect, it } from 'bun:test'
import type { ActivityTemplate, CreateTemplateInput } from '@/api/client'
import { paletteColors } from '@/theme/tokens'

describe('Activities Filter & Presentation Logic', () => {
  const sampleTemplates: ActivityTemplate[] = [
    {
      id: 'tmpl-1',
      name: 'Morning Workout',
      category: 'fitness',
      type: 'boolean',
      icon: 'activity',
      isActive: true,
      recurrenceType: 'daily',
      color: paletteColors[0],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'tmpl-2',
      name: 'Deep Work Session',
      category: 'work',
      type: 'boolean',
      icon: 'activity',
      isActive: true,
      recurrenceType: 'weekly',
      color: paletteColors[2],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'tmpl-3',
      name: 'Evening Reading',
      category: 'learning',
      type: 'boolean',
      icon: 'activity',
      isActive: true,
      recurrenceType: 'daily',
      color: paletteColors[1],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  ]

  it('filters templates by category accurately', () => {
    const filterByCategory = (templates: ActivityTemplate[], cat: string) =>
      cat === 'all'
        ? templates
        : templates.filter((t) => t.category.toLowerCase() === cat.toLowerCase())

    expect(filterByCategory(sampleTemplates, 'all')).toHaveLength(3)
    expect(filterByCategory(sampleTemplates, 'fitness')).toHaveLength(1)
    expect(filterByCategory(sampleTemplates, 'fitness')[0].name).toBe('Morning Workout')
    expect(filterByCategory(sampleTemplates, 'work')).toHaveLength(1)
    expect(filterByCategory(sampleTemplates, 'health')).toHaveLength(0)
  })

  it('filters templates by search query against name and category', () => {
    const filterByQuery = (templates: ActivityTemplate[], query: string) => {
      const q = query.trim().toLowerCase()
      if (!q) return templates
      return templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      )
    }

    expect(filterByQuery(sampleTemplates, 'morning')).toHaveLength(1)
    expect(filterByQuery(sampleTemplates, 'work')).toHaveLength(2)
    expect(filterByQuery(sampleTemplates, 'reading')).toHaveLength(1)
    expect(filterByQuery(sampleTemplates, 'nonexistent')).toHaveLength(0)
    expect(filterByQuery(sampleTemplates, '')).toHaveLength(3)
  })

  it('validates template creation payload invariants', () => {
    const validateCreateInput = (input: Partial<CreateTemplateInput>) => {
      const name = input.name?.trim()
      if (!name) return { valid: false, error: 'Activity name is required.' }
      if (!input.category) return { valid: false, error: 'Category is required.' }
      if (!input.recurrenceType) return { valid: false, error: 'Recurrence is required.' }
      return { valid: true, error: null }
    }

    expect(validateCreateInput({ name: '  ' })).toEqual({
      valid: false,
      error: 'Activity name is required.',
    })
    expect(
      validateCreateInput({
        name: 'Gym',
        category: 'fitness',
        recurrenceType: 'daily',
      })
    ).toEqual({
      valid: true,
      error: null,
    })
  })
})
