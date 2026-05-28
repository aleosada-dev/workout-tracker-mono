import type { SetType } from '@/features/exercises/lib/sets';

export interface ExerciseExecutionSet {
  id: string;
  type: SetType;
  kg: string;
  reps: string;
  target: string;
  done: boolean;
}

export interface ExerciseExecutionCardProps {
  name: string;
  variationName?: string;
  sets: ExerciseExecutionSet[];
  dragHandle?: React.ReactNode;
  onAddSet?: () => void;
  onToggleDone?: (id: string) => void;
  onChangeKg?: (id: string, value: string) => void;
  onChangeReps?: (id: string, value: string) => void;
  onChangeType?: (id: string, type: SetType) => void;
}
