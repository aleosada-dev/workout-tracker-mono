import { ApiError, ApiNetworkError, ApiUnauthorizedError } from '@/features/api/lib/errors';
import {
  classifyGlobalError,
  handleLocalError,
  isGloballyHandledError,
} from '@/features/query/lib/error-handling';

describe('classifyGlobalError', () => {
  test('classifies the errors handled by the global QueryClient handler', () => {
    expect(classifyGlobalError(new ApiUnauthorizedError())).toBe('unauthorized');
    expect(classifyGlobalError(new ApiNetworkError(new Error('offline')))).toBe('network');
    expect(classifyGlobalError(new ApiError(503, 'down'))).toBe('server');
  });

  test('returns null for 4xx and unknown errors', () => {
    expect(classifyGlobalError(new ApiError(409, 'conflict'))).toBeNull();
    expect(classifyGlobalError(new ApiError(400, 'bad request'))).toBeNull();
    expect(classifyGlobalError(new Error('boom'))).toBeNull();
  });
});

describe('isGloballyHandledError', () => {
  test('is true for globally handled errors, false otherwise', () => {
    expect(isGloballyHandledError(new ApiUnauthorizedError())).toBe(true);
    expect(isGloballyHandledError(new ApiError(500, 'boom'))).toBe(true);
    expect(isGloballyHandledError(new ApiError(409, 'conflict'))).toBe(false);
    expect(isGloballyHandledError(new Error('boom'))).toBe(false);
  });
});

describe('handleLocalError', () => {
  test('skips the handler for errors already handled globally', () => {
    const handler = jest.fn();

    handleLocalError(handler)(new ApiNetworkError(new Error('offline')));
    handleLocalError(handler)(new ApiUnauthorizedError());
    handleLocalError(handler)(new ApiError(500, 'boom'));

    expect(handler).not.toHaveBeenCalled();
  });

  test('delegates the remaining errors to the feature handler', () => {
    const handler = jest.fn();
    const conflict = new ApiError(409, 'conflict');

    handleLocalError(handler)(conflict);

    expect(handler).toHaveBeenCalledWith(conflict);
  });
});
