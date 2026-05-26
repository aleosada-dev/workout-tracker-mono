import type { CoachAthlete } from './coach-athlete';

export interface CoachRepository {
  listAthletes(coachId: string): Promise<CoachAthlete[]>;
}
