import { z } from 'zod'
import { ACTIVITY_TYPES, PRIORITIES, RECURRENCE_TYPES } from '../activity'

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Activity name is required')
    .max(200, 'Activity name must be 200 characters or fewer')
    .trim(),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(ACTIVITY_TYPES).optional().default('TASK'),
  priority: z.enum(PRIORITIES).optional().default('NORMAL'),
  estimatedDuration: z.number().int().min(0).optional(),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().min(1, 'Color is required'),
  notes: z.string().max(2000).nullable().optional(),
  amount: z.number().nullable().optional(),
  recurrenceType: z.enum(RECURRENCE_TYPES),
  recurrenceInterval: z.number().int().nullable().optional(),
  recurrenceDaysOfWeek: z.string().nullable().optional(),
  recurrenceDayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  recurrenceMonth: z.number().int().min(1).max(12).nullable().optional(),
  targetDate: z.string().nullable().optional(),
  remindBeforeDays: z.number().int().nullable().optional(),
  tagNames: z.array(z.string().trim()).optional(),
  scheduledTime: z.string().nullable().optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>