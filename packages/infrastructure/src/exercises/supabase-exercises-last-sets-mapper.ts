import type { ExerciseLastSets, ExerciseLastSetsBucket } from '@workout-tracker/domain';

/**
 * Linha plana devolvida por `wt_last_sets_by_variations`: o último set por
 * (variation, alias, logical_key), mais o `last_used_alias_id` da variation.
 */
export type LastSetsRpcRow = {
  variation_id: string;
  alias_id: string | null;
  logical_key: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  finished_at: string;
  last_used_alias_id: string | null;
};

// Bucket "sem alias" (alias_id null) não pode usar null como chave de Map.
const NO_ALIAS_KEY = '∅';

/**
 * Agrupa as linhas planas por variation e, dentro dela, por alias (bucket null =
 * "sem alias"), preservando a ordem de chegada das linhas e dos buckets.
 */
export function toExerciseLastSets(rows: LastSetsRpcRow[]): ExerciseLastSets[] {
  const byVariation = new Map<string, ExerciseLastSets>();
  const bucketsByVariation = new Map<string, Map<string, ExerciseLastSetsBucket>>();

  for (const row of rows) {
    let entry = byVariation.get(row.variation_id);
    if (!entry) {
      entry = {
        variationId: row.variation_id,
        lastUsedAliasId: row.last_used_alias_id ?? null,
        buckets: [],
      };
      byVariation.set(row.variation_id, entry);
      bucketsByVariation.set(row.variation_id, new Map());
    }

    const aliasId = row.alias_id ?? null;
    const variationBuckets = bucketsByVariation.get(row.variation_id) as Map<
      string,
      ExerciseLastSetsBucket
    >;
    const bucketKey = aliasId ?? NO_ALIAS_KEY;
    let bucket = variationBuckets.get(bucketKey);
    if (!bucket) {
      bucket = { aliasId, sets: [] };
      variationBuckets.set(bucketKey, bucket);
      entry.buckets.push(bucket);
    }
    bucket.sets.push({
      logicalKey: row.logical_key,
      weightKg: row.weight_kg ?? null,
      reps: row.reps ?? null,
      durationSeconds: row.duration_seconds ?? null,
      distanceMeters: row.distance_meters ?? null,
      finishedAt: row.finished_at,
    });
  }

  return Array.from(byVariation.values());
}
