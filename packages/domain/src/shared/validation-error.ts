export type ValidationIssue = {
  code: string;
  field?: string;
  params?: Record<string, unknown>;
};

export class ValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
