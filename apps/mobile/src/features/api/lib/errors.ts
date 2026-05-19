export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiUnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'ApiUnauthorizedError';
  }
}

export class ApiNetworkError extends Error {
  constructor(readonly cause: unknown) {
    super('Network request failed');
    this.name = 'ApiNetworkError';
  }
}
