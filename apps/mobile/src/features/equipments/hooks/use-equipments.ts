import { useQuery } from '@tanstack/react-query';
import { fetchEquipments } from '@/features/equipments/api/equipments';

export function useEquipments() {
  return useQuery({
    queryKey: ['equipments'] as const,
    queryFn: ({ signal }) => fetchEquipments({ signal }),
    staleTime: 1000 * 60 * 60,
  });
}
