export type ValidationRule =
  | { type: 'required'; message: string }
  | { type: 'pattern'; pattern: RegExp; message: string }
  | { type: 'custom'; validate: (value: string) => boolean; message: string };

/**
 * Plain value -> error-message mapping. Replicated locally rather than
 * imported from `@leslielee888888/core` (whose `validate` still exists and
 * has the identical shape/logic) because `Input` is now a plain component
 * with no `core` dependency at all -- decoupling Button/Input/Card/Badge
 * from `core` is the whole point of this change (see
 * docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md
 * §4). `PinInput` still depends on `core` directly for the `pinInput`
 * behavior factory itself; this helper keeps that dependency from leaking
 * into the plain components too.
 */
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
