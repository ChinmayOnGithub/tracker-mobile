import { z } from 'zod'

export const entityCursorSchema = z.object({
  updatedAt: z.string(),
  id: z.string(),
})

export type EntityCursor = z.infer<typeof entityCursorSchema>

export const multiEntityCursorSchema = z.object({
  templates: entityCursorSchema.nullable().optional(),
  logs: entityCursorSchema.nullable().optional(),
  notes: entityCursorSchema.nullable().optional(),
  updatedAt: z.string().optional(),
  id: z.string().optional(),
})

export type MultiEntityCursor = z.infer<typeof multiEntityCursorSchema>

export const syncLogItemSchema = z.object({
  id: z.string().min(1).max(128),
  activityId: z.string().min(1).max(128),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.string().max(50),
  note: z.string().max(2000).nullable().optional(),
  amount: z.number().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  version: z.number().int().nonnegative().optional(),
})

export const syncTemplateItemSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  category: z.string().max(100),
  icon: z.string().max(100).default('default'),
  color: z.string().max(50).default('#3b82f6'),
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  amount: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
  recurrenceType: z
    .enum(['daily', 'weekly', 'monthly', 'yearly', 'custom', 'milestone', 'one_time'])
    .default('daily'),
  recurrenceInterval: z.number().int().nullable().optional(),
  recurrenceDaysOfWeek: z.string().nullable().optional(),
  recurrenceDayOfMonth: z.number().int().nullable().optional(),
  recurrenceMonth: z.number().int().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  remindBeforeDays: z.number().int().nullable().optional(),
  version: z.number().int().nonnegative().optional(),
})