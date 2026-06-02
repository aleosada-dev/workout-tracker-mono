import { CoachSession, type CoachSessionRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function makeSupabaseCoachSessionRepository(supabase: Supabase): CoachSessionRepository {
  return {
    async listScheduledSessionsOnDate(athleteId, date, filter) {
      let query = supabase
        .from('coach_sessions')
        .select(
          'id, scheduled_at, duration_minutes, status, notes, coach_id, coach:profiles!coach_sessions_coach_id_fkey(full_name)',
        )
        .eq('athlete_id', athleteId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', date)
        .lt('scheduled_at', nextDay(date));

      if (filter?.coachId) {
        query = query.eq('coach_id', filter.coachId);
      }

      const { data, error } = await query.order('scheduled_at', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list scheduled coach sessions', error);
      }

      return (data ?? []).map((row) =>
        CoachSession.restore({
          id: row.id,
          scheduledAt: row.scheduled_at,
          durationMinutes: row.duration_minutes,
          coachId: row.coach_id,
          coachFullName: row.coach?.full_name ?? null,
          status: row.status,
          notes: row.notes,
        }),
      );
    },
  };
}
