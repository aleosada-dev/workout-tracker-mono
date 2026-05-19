import { ValidationError, type ValidationIssue } from '../shared/validation-error';

export function getIssues(fn: () => unknown): readonly ValidationIssue[] {
  try {
    fn();
  } catch (err) {
    if (err instanceof ValidationError) return err.issues;
    throw err;
  }
  throw new Error('Expected ValidationError to be thrown');
}
