import type { AlternativeDescriptor } from '@/features/workouts/lib/workout-mappers';

export interface ExerciseExecutionCardProps {
  exerciseIndex: number;
  name: string;
  variationName?: string;
  note?: string | null;
  restSeconds?: number | null;
  alternative?: AlternativeDescriptor;
  dragHandle?: React.ReactNode;
  onPressHeader?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}
