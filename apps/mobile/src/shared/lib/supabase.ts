import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.',
  );
}

export const WT_MMKV_KEY = 'wt-mmkv-key';
let encryptionKey = SecureStore.getItem(WT_MMKV_KEY);
if (!encryptionKey) {
  encryptionKey = Array.from(Crypto.getRandomBytes(32))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  SecureStore.setItem(WT_MMKV_KEY, encryptionKey);
}
export const authStorage = createMMKV({ id: 'supabase-auth', encryptionKey });

const mmkvAdapter = {
  getItem: (key: string) => authStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => {
    authStorage.set(key, value);
  },
  removeItem: (key: string) => {
    authStorage.remove(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: mmkvAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// supabase-js loga via console.error quando o refresh token persistido é
// rejeitado pelo servidor (ex.: rotacionado/revogado). Funcionalmente está OK:
// o cliente emite SIGNED_OUT e o fluxo de login assume. Rebaixamos só esse caso
// para console.warn para não poluir o console como "ERROR" no Metro.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const err = args[0] as { __isAuthError?: boolean; name?: string; code?: string } | undefined;
  if (
    err &&
    typeof err === 'object' &&
    err.__isAuthError === true &&
    err.name === 'AuthApiError' &&
    err.code === 'refresh_token_not_found'
  ) {
    console.warn(...args);
    return;
  }
  originalConsoleError(...args);
};
