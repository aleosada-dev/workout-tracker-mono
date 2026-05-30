export type SupersetMemberLike = {
  id: string;
  supersetGroupId: string;
};

export function isSupersetGroup<T extends SupersetMemberLike>(exercises: readonly T[]): boolean {
  return (
    exercises.length >= 2 && exercises.every((exercise) => exercise.supersetGroupId !== exercise.id)
  );
}
