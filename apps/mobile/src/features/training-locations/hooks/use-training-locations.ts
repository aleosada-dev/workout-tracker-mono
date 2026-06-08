import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  type CreateTrainingLocationRequest,
  createTrainingLocation,
  deleteTrainingLocation,
  fetchTrainingLocations,
  type TrainingLocationsResponse,
  type UpdateTrainingLocationRequest,
  updateTrainingLocation,
} from '@/features/training-locations/api/training-locations';

const TRAINING_LOCATIONS_KEY = ['training-locations'] as const;

export const trainingLocationsQueryKey = (userId: string | undefined) =>
  [...TRAINING_LOCATIONS_KEY, userId] as const;

export function useTrainingLocations(userId?: string | null) {
  const { session } = useSession();
  const targetUserId = userId ?? session?.user.id;

  return useQuery<TrainingLocationsResponse>({
    queryKey: trainingLocationsQueryKey(targetUserId ?? undefined),
    queryFn: ({ signal }) => fetchTrainingLocations({ userId: targetUserId ?? undefined, signal }),
    enabled: !!targetUserId,
  });
}

export function useCreateTrainingLocation(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (body: Omit<CreateTrainingLocationRequest, 'userId'>) =>
      createTrainingLocation({ ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_LOCATIONS_KEY });
    },
  });
}

export function useUpdateTrainingLocation(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: ({
      locationId,
      body,
    }: {
      locationId: string;
      body: UpdateTrainingLocationRequest;
    }) => updateTrainingLocation(locationId, { ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_LOCATIONS_KEY });
    },
  });
}

export function useDeleteTrainingLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: string) => deleteTrainingLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_LOCATIONS_KEY });
    },
  });
}
