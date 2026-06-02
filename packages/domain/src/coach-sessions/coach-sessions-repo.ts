import type { CoachSession } from './coach-session';

export type CoachSessionParticipants = {
  coachId: string;
  athleteId: string | null;
};

export type CreateCompletedSessionInput = {
  coachId: string;
  athleteId: string;
  requestedBy: string;
  scheduledAt: string;
  durationMinutes: number;
};

export interface CoachSessionRepository {
  listScheduledSessionsOnDate(
    athleteId: string,
    date: string,
    filter?: { coachId?: string },
  ): Promise<CoachSession[]>;
}
