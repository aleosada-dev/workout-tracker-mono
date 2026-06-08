import type { SupersetMember } from '@/features/workouts/lib/workout-mappers';

export interface SupersetExecutionCardProps {
  members: SupersetMember[];
  restSeconds?: number | null;
  dragHandle?: React.ReactNode;
  onPressMember?: (variationId: string, aliasId: string | null) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}
