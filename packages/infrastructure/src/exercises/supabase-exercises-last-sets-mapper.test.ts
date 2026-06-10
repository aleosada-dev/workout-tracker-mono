import { describe, expect, test } from 'bun:test';
import { type LastSetsRpcRow, toExerciseLastSets } from './supabase-exercises-last-sets-mapper';

function row(overrides: Partial<LastSetsRpcRow>): LastSetsRpcRow {
  return {
    variation_id: 'v-1',
    alias_id: null,
    logical_key: 'normal-1',
    weight_kg: 100,
    reps: 10,
    duration_seconds: null,
    distance_meters: null,
    finished_at: '2026-06-01T00:00:00Z',
    last_used_alias_id: null,
    ...overrides,
  };
}

describe('toExerciseLastSets', () => {
  test('returns an empty array for no rows', () => {
    expect(toExerciseLastSets([])).toEqual([]);
  });

  test('groups sets into a single "no alias" bucket', () => {
    const result = toExerciseLastSets([
      row({ logical_key: 'warmup-1', weight_kg: 40, reps: 12 }),
      row({ logical_key: 'normal-1', weight_kg: 100, reps: 10 }),
    ]);

    expect(result).toHaveLength(1);
    const [variation] = result;
    expect(variation.variationId).toBe('v-1');
    expect(variation.lastUsedAliasId).toBeNull();
    expect(variation.buckets).toHaveLength(1);
    expect(variation.buckets[0].aliasId).toBeNull();
    expect(variation.buckets[0].sets).toEqual([
      {
        logicalKey: 'warmup-1',
        weightKg: 40,
        reps: 12,
        durationSeconds: null,
        distanceMeters: null,
        finishedAt: '2026-06-01T00:00:00Z',
      },
      {
        logicalKey: 'normal-1',
        weightKg: 100,
        reps: 10,
        durationSeconds: null,
        distanceMeters: null,
        finishedAt: '2026-06-01T00:00:00Z',
      },
    ]);
  });

  test('splits sets into one bucket per alias and carries lastUsedAliasId', () => {
    const result = toExerciseLastSets([
      row({ alias_id: 'a-1', logical_key: 'normal-1', weight_kg: 80, last_used_alias_id: 'a-2' }),
      row({ alias_id: 'a-2', logical_key: 'normal-1', weight_kg: 110, last_used_alias_id: 'a-2' }),
      row({ alias_id: null, logical_key: 'normal-1', weight_kg: 95, last_used_alias_id: 'a-2' }),
    ]);

    expect(result).toHaveLength(1);
    const [variation] = result;
    expect(variation.lastUsedAliasId).toBe('a-2');
    expect(variation.buckets.map((b) => b.aliasId)).toEqual(['a-1', 'a-2', null]);
    expect(variation.buckets[1].sets).toEqual([
      {
        logicalKey: 'normal-1',
        weightKg: 110,
        reps: 10,
        durationSeconds: null,
        distanceMeters: null,
        finishedAt: '2026-06-01T00:00:00Z',
      },
    ]);
  });

  test('separates variations and preserves null weight/reps', () => {
    const result = toExerciseLastSets([
      row({ variation_id: 'v-1', logical_key: 'normal-1', weight_kg: null, reps: null }),
      row({ variation_id: 'v-2', logical_key: 'normal-1', weight_kg: 50, reps: 8 }),
    ]);

    expect(result.map((v) => v.variationId)).toEqual(['v-1', 'v-2']);
    expect(result[0].buckets[0].sets[0]).toEqual({
      logicalKey: 'normal-1',
      weightKg: null,
      reps: null,
      durationSeconds: null,
      distanceMeters: null,
      finishedAt: '2026-06-01T00:00:00Z',
    });
  });

  test('carries duration and distance through', () => {
    const result = toExerciseLastSets([
      row({
        logical_key: 'normal-1',
        weight_kg: null,
        reps: null,
        duration_seconds: 90,
        distance_meters: 5000,
      }),
    ]);

    expect(result[0].buckets[0].sets[0]).toEqual({
      logicalKey: 'normal-1',
      weightKg: null,
      reps: null,
      durationSeconds: 90,
      distanceMeters: 5000,
      finishedAt: '2026-06-01T00:00:00Z',
    });
  });
});
