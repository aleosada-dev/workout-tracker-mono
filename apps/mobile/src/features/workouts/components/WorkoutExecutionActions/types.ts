export interface WorkoutExecutionActionsTimer {
  active: boolean;
  label: string;
  isPaused: boolean;
  onPauseResume: () => void;
  onStop: () => void;
  onOpen: () => void;
}

export interface WorkoutExecutionActionsProps {
  onReview: () => void;
  onTimer: () => void;
  onNotes: () => void;
  onAddExercise: () => void;
  onKgLbsCalculator: () => void;
  timer: WorkoutExecutionActionsTimer;
}
