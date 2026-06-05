import {
  ConflictError,
  type TrainingLocation,
  type TrainingLocationRepository,
} from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

const COLUMNS = 'id, user_id, name, created_at, updated_at';

type TrainingLocationRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function toTrainingLocation(row: TrainingLocationRow): TrainingLocation {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function makeSupabaseTrainingLocationRepository(
  supabase: Supabase,
): TrainingLocationRepository {
  return {
    async list({ userId }) {
      const { data, error } = await supabase
        .from('training_locations')
        .select(COLUMNS)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list training locations', error);
      }

      return (data ?? []).map(toTrainingLocation);
    },

    async create({ userId, name }) {
      const { data, error } = await supabase
        .from('training_locations')
        .insert({ user_id: userId, name })
        .select(COLUMNS)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('training location already exists');
        }
        throw supabaseError('Failed to create training location', error);
      }

      return toTrainingLocation(data as TrainingLocationRow);
    },

    async update({ userId, locationId, name }) {
      const { data, error } = await supabase
        .from('training_locations')
        .update({ name })
        .eq('id', locationId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select(COLUMNS)
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('training location already exists');
        }
        throw supabaseError('Failed to update training location', error);
      }

      if (!data) return null;
      return toTrainingLocation(data as TrainingLocationRow);
    },

    async softDelete({ userId, locationId }) {
      const { data, error } = await supabase
        .from('training_locations')
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq('id', locationId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();

      if (error) {
        throw supabaseError('Failed to delete training location', error);
      }

      return { deleted: data !== null };
    },
  };
}
