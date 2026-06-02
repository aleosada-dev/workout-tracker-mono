import type { CoachSession, CoachSessionRepository } from '@workout-tracker/domain';

export type ListScheduledSessions = (
  requesterId: string,
  athleteId: string,
  date: string,
) => Promise<CoachSession[]>;

export function makeListScheduledSessions(
  repository: CoachSessionRepository,
): ListScheduledSessions {
  return (requesterId, athleteId, date) => {
    const coachId = requesterId === athleteId ? undefined : requesterId;
    return repository.listScheduledSessionsOnDate(athleteId, date, { coachId });
  };
}
