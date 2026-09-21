import type { ValidationRule } from './types';

export function validate(
  value: string,
  rules: ValidationRule[]
): { isValid: boolean; errorMessage?: string } {
  for (const rule of rules) {
    if (rule.type === 'required' && value.trim() === '') {
      return { isValid: false, errorMessage: rule.message };
    }
    if (rule.type === 'pattern' && value !== '' && !rule.pattern.test(value)) {
      return { isValid: false, errorMessage: rule.message };
    }
    if (rule.type === 'custom' && !rule.validate(value)) {
      return { isValid: false, errorMessage: rule.message };
    }
  }
  return { isValid: true };
}
