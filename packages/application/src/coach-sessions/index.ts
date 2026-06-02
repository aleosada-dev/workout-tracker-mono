import type { CoachSessionRepository } from '@workout-tracker/domain';
import { makeListScheduledSessions } from './list-scheduled-sessions';

export function makeCoachSessionApp(repository: CoachSessionRepository) {
  return {
    listScheduledSessions: makeListScheduledSessions(repository),
  };
}

export * from './list-scheduled-sessions';
