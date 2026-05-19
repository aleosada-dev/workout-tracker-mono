import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { isDebugAllowed } from '@/shared/lib/debug-helpers';
import { disableSlowAuth } from '@/shared/lib/debug-slow-auth';
import { authStorage, supabase, WT_MMKV_KEY } from '@/shared/lib/supabase';

export async function debugResetAuth() {
  if (!isDebugAllowed()) return;
  try {
    disableSlowAuth();
    await supabase.auth.signOut();
    authStorage.clearAll();
    await SecureStore.deleteItemAsync(WT_MMKV_KEY).catch(() => {});
    Toast.show({ type: 'success', text1: 'E2E reset OK' });
  } catch (e) {
    console.warn('[debug-reset] failed', e);
  }
}
