import { Equipment, type EquipmentRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

export function makeSupabaseEquipmentRepository(supabase: Supabase): EquipmentRepository {
  return {
    async listAll(): Promise<Equipment[]> {
      const { data, error } = await supabase
        .from('equipments')
        .select('id, name, slug, preposition, created_at');

      if (error) {
        throw supabaseError('Failed to list equipments', error);
      }

      return (data ?? []).map((row) =>
        Equipment.restore({
          id: row.id,
          name: row.name,
          slug: row.slug,
          preposition: row.preposition,
          createdAt: new Date(row.created_at),
        }),
      );
    },
  };
}
