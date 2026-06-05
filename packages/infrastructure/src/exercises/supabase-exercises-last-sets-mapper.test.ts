import { describe, expect, test } from 'bun:test';
import { type LastSetsRpcRow, toExerciseLastSets } from './supabase-exercises-last-sets-mapper';

function row(overrides: Partial<LastSetsRpcRow>): LastSetsRpcRow {
  return {
    variation_id: 'v-1',
    alias_id: null,
    logical_key: 'normal-1',
    weight_kg: 100,
    reps: 10,
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
      { logicalKey: 'warmup-1', weightKg: 40, reps: 12 },
      { logicalKey: 'normal-1', weightKg: 100, reps: 10 },
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
      { logicalKey: 'normal-1', weightKg: 110, reps: 10 },
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
    });
  });
});
