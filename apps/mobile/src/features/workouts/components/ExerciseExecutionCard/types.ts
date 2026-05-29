export interface ExerciseExecutionCardProps {
  exerciseIndex: number;
  name: string;
  variationName?: string;
  note?: string | null;
  restSeconds?: number | null;
  setTargets: string[];
  dragHandle?: React.ReactNode;
  onPressHeader?: () => void;
}
