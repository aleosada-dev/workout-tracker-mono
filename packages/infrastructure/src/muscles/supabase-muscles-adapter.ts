import { Muscle, type MuscleProps, type MuscleRepository } from '@workout-tracker/domain';
import type { Supabase } from '../supabase/client';
import { supabaseError } from '../supabase/supabase-error';

type MuscleRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
  created_at: string;
};

const MUSCLE_COLUMNS = 'id, name, parent_id, level, sort_order, created_at, slug';

function toFlatProps(row: MuscleRow): MuscleProps {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    children: null,
    level: row.level,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  };
}

export function makeSupabaseMuscleRepository(supabase: Supabase): MuscleRepository {
  return {
    async listAll(): Promise<Muscle[]> {
      const { data, error } = await supabase
        .from('muscles')
        .select(MUSCLE_COLUMNS)
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list muscles', error);
      }

      return (data ?? []).map((row) => Muscle.restore(toFlatProps(row)));
    },

    async listTree(): Promise<Muscle[]> {
      const { data, error } = await supabase
        .from('muscles')
        .select(MUSCLE_COLUMNS)
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) {
        throw supabaseError('Failed to list muscles tree', error);
      }

      const propsById = new Map<string, MuscleProps>();
      const all: MuscleProps[] = (data ?? []).map((row) => {
        const props: MuscleProps = {
          ...toFlatProps(row),
          children: [],
        };
        propsById.set(props.id, props);
        return props;
      });

      const roots: MuscleProps[] = [];
      for (const p of all) {
        if (p.parentId === null) {
          roots.push(p);
        } else {
          propsById.get(p.parentId)?.children?.push(p);
        }
      }

      return roots.map((p) => Muscle.restore(p));
    },
  };
}
