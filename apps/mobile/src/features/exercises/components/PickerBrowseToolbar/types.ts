import type { IconAction } from '@/features/shared/components/SelectionToolbar';

export interface PickerBrowseToolbarProps {
  headerAction?: IconAction;
  onCreateExercise: () => void;
  onCreateSuperset: () => void;
}
