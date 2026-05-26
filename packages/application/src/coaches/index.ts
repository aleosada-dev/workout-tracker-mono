import type { CoachRepository } from '@workout-tracker/domain';
import { makeListCoachAthletes } from './list-coach-athletes';

export function makeCoachApp(repository: CoachRepository) {
  return {
    listAthletes: makeListCoachAthletes(repository),
  };
}

export * from './list-coach-athletes';
