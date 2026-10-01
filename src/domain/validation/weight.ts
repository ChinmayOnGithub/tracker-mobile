import { z } from 'zod'

export const weightUnitSchema = z.enum(['kg', 'lbs'])
export type WeightUnit = z.infer<typeof weightUnitSchema>

export const createWeightSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  weight: z
    .number()
    .positive('Weight must be positive')
    .max(500, 'Weight must be realistic (under 500kg/lbs)'),
  unit: weightUnitSchema.default('kg'),
  note: z.string().max(500).nullable().optional(),
})

export type CreateWeightInput = z.infer<typeof createWeightSchema>

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight
  if (from === 'kg' && to === 'lbs') {
    return parseFloat((weight * 2.20462).toFixed(2))
  }
  return parseFloat((weight / 2.20462).toFixed(2))
}