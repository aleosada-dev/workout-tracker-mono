export interface ExerciseExecutionCardProps {
  exerciseIndex: number;
  name: string;
  variationName?: string;
  setTargets: string[];
  dragHandle?: React.ReactNode;
  onPressHeader?: () => void;
}
