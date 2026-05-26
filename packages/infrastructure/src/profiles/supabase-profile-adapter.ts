import { Profile, type ProfileRepository, type UserRole } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

export function makeSupabaseProfileRepository(supabase: Supabase): ProfileRepository {
  return {
    async getById(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to load profile', error);
      }
      if (!data) return null;

      return Profile.restore({
        id: data.id,
        role: data.role as UserRole,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
      });
    },
  };
}
