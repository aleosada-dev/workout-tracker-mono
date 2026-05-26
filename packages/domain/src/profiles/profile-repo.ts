import type { Profile } from './profile';

export interface ProfileRepository {
  getById(userId: string): Promise<Profile | null>;
}
