import type { ValidationRule } from '../types';

export function validate(
  value: string,
  rules: ValidationRule[]
): { isValid: boolean; errorMessage?: string } {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (value.trim() === '') {
          return { isValid: false, errorMessage: rule.message };
        }
        break;
      case 'pattern':
        if (value !== '') {
          rule.pattern.lastIndex = 0;
          if (!rule.pattern.test(value)) {
            return { isValid: false, errorMessage: rule.message };
          }
        }
        break;
      case 'custom':
        if (!rule.validate(value)) {
          return { isValid: false, errorMessage: rule.message };
        }
        break;
    }
  }
  return { isValid: true };
}
