import type { CoachAthlete, CoachRepository } from '@workout-tracker/domain';

export type ListCoachAthletes = (coachId: string) => Promise<CoachAthlete[]>;

export function makeListCoachAthletes(repository: CoachRepository): ListCoachAthletes {
  return (coachId) => repository.listAthletes(coachId);
}
