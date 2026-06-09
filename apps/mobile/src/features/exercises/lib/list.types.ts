export type ExerciseListItem = {
  id: string;
  name: string;
  variationName: string | null;
  primaryMuscle: string;
  type: string;
  measurementType: string;
  visibility: string;
  userId: string | null;
};
