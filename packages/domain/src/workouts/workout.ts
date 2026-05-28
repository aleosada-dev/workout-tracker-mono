import type { ExerciseType } from '../exercises/models';
import type { WorkoutSetType } from '../set/sets';
import type { WorkoutFolderColor } from './workout-folder';

export type WorkoutTopExercise = {
  slug: string | null;
  name: string;
  variationSlug: string | null;
  variationName: string | null;
  equipmentSlug: string;
  equipmentPreposition: string;
};

export type Workout = {
  id: string;
  userId: string;
  name: string;
  folderId: string | null;
  folderName: string | null;
  exerciseCount: number;
  muscleSlugs: string[];
  topExercises: WorkoutTopExercise[];
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutDetailSet = {
  id: string;
  setOrder: number;
  setType: WorkoutSetType;
  repsMin: number;
  repsMax: number;
  linkedSetId: string | null;
  loadPercentOfPrevious: number | null;
};

export type WorkoutDetailExerciseVariation = {
  id: string;
  slug: string | null;
  name: string | null;
  exercise: { slug: string | null; name: string; type: ExerciseType };
  equipment: { slug: string; preposition: string };
  muscle: { slug: string };
  secondaryMuscle: { slug: string } | null;
};

export type WorkoutDetailExercise = {
  id: string;
  position: number;
  supersetGroupId: string;
  supersetOrder: number;
  note: string | null;
  restSeconds: number | null;
  variation: WorkoutDetailExerciseVariation;
  sets: WorkoutDetailSet[];
};

export type WorkoutDetail = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  exercises: WorkoutDetailExercise[];
};

export type GetWorkoutInput = {
  userId: string;
  workoutId: string;
};

export type ListWorkoutsFilter = {
  userId: string;
  folderId?: string | null;
};

export type DeleteWorkoutsInput = {
  userId: string;
  workoutIds: string[];
};

export type MoveWorkoutsInput = {
  userId: string;
  workoutIds: string[];
  targetFolderId: string | null;
};

export type CopyWorkoutsInput = {
  workoutIds: string[];
  targetUserId: string;
  targetFolderId: string | null;
};

export type CopyWorkoutsTarget =
  | { kind: 'root' }
  | { kind: 'existing'; folderId: string }
  | { kind: 'new'; name: string; color: WorkoutFolderColor };

export type CopyWorkoutsCommand = {
  workoutIds: string[];
  targetUserId: string;
  target: CopyWorkoutsTarget;
};
