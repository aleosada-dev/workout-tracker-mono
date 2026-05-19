import { isDebugAllowed } from '@/shared/lib/debug-helpers';
import { supabase } from '@/shared/lib/supabase';

let originalSignIn: typeof supabase.auth.signInWithPassword | null = null;

export function enableSlowAuth(delayMs: number) {
  if (!isDebugAllowed()) return;
  if (!originalSignIn) {
    originalSignIn = supabase.auth.signInWithPassword.bind(supabase.auth);
  }
  const original = originalSignIn;
  supabase.auth.signInWithPassword = async (credentials) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return original(credentials);
  };
}

export function disableSlowAuth() {
  if (originalSignIn) {
    supabase.auth.signInWithPassword = originalSignIn;
    originalSignIn = null;
  }
}
