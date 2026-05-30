import type { SupersetMember } from '@/features/workouts/lib/workout-mappers';

export interface SupersetExecutionCardProps {
  members: SupersetMember[];
  restSeconds?: number | null;
  dragHandle?: React.ReactNode;
  onPressMember?: (variationId: string) => void;
}
