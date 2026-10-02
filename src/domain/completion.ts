import type { ActivityTemplate } from '@/api/client'

export interface CompletionConfig {
  method: 'CHECKBOX' | 'VALUE' | 'FORM'
  hook?: string
  value?: {
    label: string
    unit?: string
    required?: boolean
    inputType?: 'number' | 'decimal' | 'currency' | 'text' | 'duration' | 'percentage'
    minimum?: number | null
    maximum?: number | null
  }
}

export class MobileCompletionService {
  /**
   * Resolves the completion config for a template.
   */
  static getCompletionConfig(template: ActivityTemplate): CompletionConfig {
    if (!template) {
      return { method: 'CHECKBOX' }
    }

    try {
      const meta = typeof template.metadata === 'string'
        ? JSON.parse(template.metadata)
        : template.metadata || {}

      if (meta.completion) {
        return meta.completion
      }
    } catch {
      // Fallback
    }

    // Heuristic: If template has an amount or currency/unit in notes/name
    if (typeof template.amount === 'number' && template.amount > 0) {
      return {
        method: 'VALUE',
        value: {
          label: 'Amount',
          unit: '',
          inputType: 'number',
        },
      }
    }

    return { method: 'CHECKBOX' }
  }

  /**
   * Checks if an activity requires manual value input before completion.
   */
  static needsValuePrompt(template: ActivityTemplate): boolean {
    const config = this.getCompletionConfig(template)
    return config.method === 'VALUE'
  }

  /**
   * Formats the completion display representation for tasks and habit occurrences.
   * Handles:
   * - Generic VALUE activities (e.g. Fuel 12.5 L, Water 750 ml)
   * - Monetary / financial activities (e.g. ₹1200)
   * - Raw logged amount fallback
   */
  static formatCompletionDisplay(
    template: ActivityTemplate | null | undefined,
    payload: unknown,
    amount?: number | null
  ): { formatted: string; isMoney: boolean } | null {
    if (!template) return null

    const config = this.getCompletionConfig(template)

    // 1. Check if payload has structured value & unit
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>
      if ('value' in obj && obj.value !== undefined && obj.value !== null && obj.value !== '') {
        const unitStr = obj.unit ? ` ${obj.unit}` : config.value?.unit ? ` ${config.value.unit}` : ''
        const isMoney = config.value?.inputType === 'currency'
        const valStr = isMoney ? `₹${obj.value}` : `${obj.value}${unitStr}`
        return { formatted: valStr.trim(), isMoney }
      }
    }

    // 2. Check if logged numeric amount is present
    if (amount !== undefined && amount !== null) {
      const unitStr = config.value?.unit ? ` ${config.value.unit}` : ''
      const isMoney = config.value?.inputType === 'currency'
      const valStr = isMoney ? `₹${amount}` : `${amount}${unitStr}`
      return { formatted: valStr.trim(), isMoney }
    }

    // 3. Fallback: If template itself has a target amount and is done
    if (typeof template.amount === 'number' && template.amount > 0) {
      const unitStr = config.value?.unit ? ` ${config.value.unit}` : ''
      return { formatted: `${template.amount}${unitStr}`.trim(), isMoney: false }
    }

    return null
  }

  /**
   * Validates custom numeric or text input based on config constraints.
   */
  static validateInput(
    config: CompletionConfig,
    inputStr: string
  ): { success: boolean; error?: string; parsedValue?: string | number | null } {
    if (config.method !== 'VALUE' || !config.value) {
      return { success: true }
    }

    const { required, minimum, maximum, inputType } = config.value
    const trimmed = inputStr.trim()

    if (trimmed === '') {
      if (required) {
        return { success: false, error: `${config.value.label || 'Value'} is required.` }
      }
      return { success: true, parsedValue: null }
    }

    const isNumeric = ['number', 'decimal', 'currency', 'percentage', 'duration'].includes(
      inputType || 'number'
    )

    if (isNumeric) {
      const num = Number(trimmed)
      if (isNaN(num)) {
        return { success: false, error: 'Please enter a valid number.' }
      }
      if (minimum !== undefined && minimum !== null && num < minimum) {
        return { success: false, error: `Value must be at least ${minimum}.` }
      }
      if (maximum !== undefined && maximum !== null && num > maximum) {
        return { success: false, error: `Value must be at most ${maximum}.` }
      }
      return { success: true, parsedValue: num }
    }

    return { success: true, parsedValue: trimmed }
  }
}
