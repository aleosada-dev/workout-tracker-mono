import { ApiError, ApiNetworkError, ApiUnauthorizedError } from '@/features/api/lib/errors';

describe('ApiError', () => {
  test('exposes status, message, and optional code', () => {
    const err = new ApiError(500, 'Boom', 'INTERNAL');
    expect(err.status).toBe(500);
    expect(err.message).toBe('Boom');
    expect(err.code).toBe('INTERNAL');
    expect(err.name).toBe('ApiError');
  });

  test('code is undefined when not provided', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.code).toBeUndefined();
  });
});

describe('ApiUnauthorizedError', () => {
  test('is an ApiError with status 401', () => {
    const err = new ApiUnauthorizedError('Token expired');
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(ApiUnauthorizedError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Token expired');
    expect(err.name).toBe('ApiUnauthorizedError');
  });

  test('defaults message to "Unauthorized"', () => {
    const err = new ApiUnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ApiNetworkError', () => {
  test('wraps the underlying cause', () => {
    const cause = new TypeError('Network request failed');
    const err = new ApiNetworkError(cause);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('ApiNetworkError');
    expect(err.message).toBe('Network request failed');
  });

  test('is not an ApiError (network failures have no HTTP status)', () => {
    const err = new ApiNetworkError(new Error('boom'));
    expect(err).not.toBeInstanceOf(ApiError);
  });
});

describe('ApiError details', () => {
  test('exposes optional details payload', () => {
    const details = { fields: { email: ['Email já em uso'] } };
    const err = new ApiError(422, 'Validação falhou', 'VALIDATION_ERROR', details);

    expect(err.details).toBe(details);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(422);
  });

  test('details defaults to undefined when omitted', () => {
    const err = new ApiError(500, 'boom');

    expect(err.details).toBeUndefined();
  });
});
