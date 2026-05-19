import type { AuthError } from '@supabase/supabase-js';

/**
 * Maps a Supabase auth error to a translation key under `signInScreen.errors`.
 * Supabase returns English-only `error.message`, so the sign-in screen must not
 * surface it directly — resolve a localized message from the stable `error.code`
 * instead, falling back to a generic message for unmapped/unknown codes.
 */
export function signInErrorMessageKey(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'signInScreen.errors.invalidCredentials';
    case 'email_not_confirmed':
      return 'signInScreen.errors.emailNotConfirmed';
    case 'over_request_rate_limit':
      return 'signInScreen.errors.tooManyRequests';
    default:
      return 'signInScreen.errors.generic';
  }
}
