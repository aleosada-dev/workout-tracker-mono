import type { UserPreferences, UserPreferencesRepository } from '@workout-tracker/domain';

export type GetUserPreferences = (userId: string) => Promise<UserPreferences>;

export function makeGetUserPreferences(repository: UserPreferencesRepository): GetUserPreferences {
  return (userId) => repository.get(userId);
}
