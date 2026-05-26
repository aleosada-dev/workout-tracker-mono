import type { ProfileRepository } from '@workout-tracker/domain';
import { makeGetProfile } from './get-profile';

export function makeProfileApp(repository: ProfileRepository) {
  return {
    getById: makeGetProfile(repository),
  };
}

export * from './get-profile';
