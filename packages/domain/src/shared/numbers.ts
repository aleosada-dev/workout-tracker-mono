import type { ValidationIssue } from './validation-error';

export function nonNegativeInteger(field: string, value: number): ValidationIssue[] {
  if (!Number.isInteger(value) || value < 0) {
    return [{ code: 'validation.non_negative_integer', field }];
  }
  return [];
}

export function nonNegativeIntegerOrNull(field: string, value: number | null): ValidationIssue[] {
  if (value === null) return [];
  return nonNegativeInteger(field, value);
}

export function greaterThan(field: string, value: number, min: number): ValidationIssue[] {
  if (!Number.isInteger(value) || value <= min) {
    return [{ code: 'validation.integer_greater_than', field, params: { min } }];
  }
  return [];
}

export function greaterThanOrNull(
  field: string,
  value: number | null,
  min: number,
): ValidationIssue[] {
  if (value === null) return [];
  return greaterThan(field, value, min);
}

export function positiveNumberOrNull(field: string, value: number | null): ValidationIssue[] {
  if (value === null) return [];
  if (!Number.isFinite(value) || value <= 0) {
    return [{ code: 'validation.positive_number', field }];
  }
  return [];
}
