import type {
  PreferencesPatch,
  UserPreferences,
  UserPreferencesRepository,
} from '@workout-tracker/domain';

export type UpdateUserPreferences = (
  userId: string,
  patch: PreferencesPatch,
) => Promise<UserPreferences>;

export function makeUpdateUserPreferences(
  repository: UserPreferencesRepository,
): UpdateUserPreferences {
  return (userId, patch) => repository.set(userId, patch);
}
