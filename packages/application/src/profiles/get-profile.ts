import type { Profile, ProfileRepository } from '@workout-tracker/domain';

export type GetProfile = (userId: string) => Promise<Profile | null>;

export function makeGetProfile(repository: ProfileRepository): GetProfile {
  return (userId) => repository.getById(userId);
}
