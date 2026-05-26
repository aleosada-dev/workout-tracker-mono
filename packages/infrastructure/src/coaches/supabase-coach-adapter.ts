import { CoachAthlete, type CoachRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

export function makeSupabaseCoachRepository(supabase: Supabase): CoachRepository {
  return {
    async listAthletes(coachId) {
      const { data, error } = await supabase
        .from('coach_athletes_with_profiles')
        .select('athlete_id, athlete_full_name, athlete_avatar_url, status')
        .eq('coach_id', coachId)
        .eq('status', 'active');

      if (error) {
        throw supabaseError('Failed to list coach athletes', error);
      }

      return (data ?? [])
        .filter((row): row is typeof row & { athlete_id: string } => row.athlete_id !== null)
        .map((row) =>
          CoachAthlete.restore({
            athleteId: row.athlete_id,
            fullName: row.athlete_full_name,
            avatarUrl: row.athlete_avatar_url,
          }),
        );
    },
  };
}
