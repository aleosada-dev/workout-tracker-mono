export interface ExerciseExecutionCardProps {
  exerciseIndex: number;
  name: string;
  variationName?: string;
  note?: string | null;
  restSeconds?: number | null;
  dragHandle?: React.ReactNode;
  onPressHeader?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}
