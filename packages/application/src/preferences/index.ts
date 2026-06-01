import type { UserPreferencesRepository } from '@workout-tracker/domain';
import { makeGetUserPreferences } from './get-user-preferences';
import { makeUpdateUserPreferences } from './update-user-preferences';

export function makeUserPreferencesApp(repository: UserPreferencesRepository) {
  return {
    get: makeGetUserPreferences(repository),
    update: makeUpdateUserPreferences(repository),
  };
}

export * from './get-user-preferences';
export * from './update-user-preferences';
