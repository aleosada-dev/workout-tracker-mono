import type { PreferencesPatch, UserPreferences } from './user-preferences';

export interface UserPreferencesRepository {
  get(userId: string): Promise<UserPreferences>;
  set(userId: string, patch: PreferencesPatch): Promise<UserPreferences>;
}
