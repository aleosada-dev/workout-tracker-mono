import {
  parseStoredPreferences,
  preferencesPatchToStored,
  type UserPreferencesRepository,
} from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';
import type { Json } from '../supabase/types';

export function makeSupabaseUserPreferencesRepository(
  supabase: Supabase,
): UserPreferencesRepository {
  return {
    async get(userId) {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('key, value')
        .eq('user_id', userId);

      if (error) {
        throw supabaseError('Failed to load user preferences', error);
      }

      return parseStoredPreferences(data ?? []);
    },

    async set(_userId, patch) {
      const { data, error } = await supabase.rpc('wt_set_user_preferences', {
        p_prefs: preferencesPatchToStored(patch) as Json,
      });

      if (error) {
        throw supabaseError('Failed to update user preferences', error);
      }

      return parseStoredPreferences(data ?? []);
    },
  };
}
