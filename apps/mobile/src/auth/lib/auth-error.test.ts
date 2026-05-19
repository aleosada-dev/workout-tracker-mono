import { AuthError } from '@supabase/supabase-js';
import { signInErrorMessageKey } from '@/auth/lib/auth-error';

describe('signInErrorMessageKey', () => {
  test('maps invalid_credentials to a localized key', () => {
    const error = new AuthError('Invalid login credentials', 400, 'invalid_credentials');
    expect(signInErrorMessageKey(error)).toBe('signInScreen.errors.invalidCredentials');
  });

  test('maps email_not_confirmed', () => {
    const error = new AuthError('Email not confirmed', 400, 'email_not_confirmed');
    expect(signInErrorMessageKey(error)).toBe('signInScreen.errors.emailNotConfirmed');
  });

  test('maps over_request_rate_limit', () => {
    const error = new AuthError('Too many requests', 429, 'over_request_rate_limit');
    expect(signInErrorMessageKey(error)).toBe('signInScreen.errors.tooManyRequests');
  });

  test('falls back to generic for unknown codes', () => {
    const error = new AuthError('Boom', 500, 'unexpected_failure');
    expect(signInErrorMessageKey(error)).toBe('signInScreen.errors.generic');
  });

  test('falls back to generic when no code is present', () => {
    const error = new AuthError('Network down');
    expect(signInErrorMessageKey(error)).toBe('signInScreen.errors.generic');
  });
});
