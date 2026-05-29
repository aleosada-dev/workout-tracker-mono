import { describe, expect, test } from 'bun:test';
import { matchSets } from './match-sets';

const set = (setType: 'warmup' | 'normal' | 'drop' | 'cluster', setOrder: number) => ({
  setType,
  setOrder,
});

describe('matchSets', () => {
  test('returns empty array when both sides are empty', () => {
    expect(matchSets([], [])).toEqual([]);
  });

  test('returns all-null-a matches when A is empty', () => {
    const out = matchSets([], [set('normal', 1), set('normal', 2)]);
    expect(out.map((m) => m.logicalKey)).toEqual(['normal-1', 'normal-2']);
    expect(out.every((m) => m.a === null)).toBe(true);
    expect(out.every((m) => m.b !== null)).toBe(true);
  });

  test('pairs equal lists on every logical key', () => {
    const a = [set('normal', 1), set('normal', 2)];
    const b = [set('normal', 1), set('normal', 2)];
    const out = matchSets(a, b);
    expect(out.map((m) => m.logicalKey)).toEqual(['normal-1', 'normal-2']);
    expect(out.every((m) => m.a !== null && m.b !== null)).toBe(true);
  });

  test('emits lone-side entries with the other side null', () => {
    const a = [set('normal', 1), set('drop', 2), set('normal', 3)];
    const b = [set('normal', 1), set('normal', 2)];
    const out = matchSets(a, b);
    expect(out.map((m) => m.logicalKey)).toEqual(['normal-1', 'n1-drop-1', 'normal-2']);
    const drop = out.find((m) => m.logicalKey === 'n1-drop-1');
    expect(drop?.a).not.toBeNull();
    expect(drop?.b).toBeNull();
  });

  test('does NOT match a cluster under normal-1 in A with a cluster under normal-2 in B', () => {
    const a = [set('normal', 1), set('cluster', 2)];
    const b = [set('normal', 1), set('normal', 2), set('cluster', 3)];
    const out = matchSets(a, b);
    expect(out.map((m) => m.logicalKey)).toEqual([
      'normal-1',
      'n1-cluster-1',
      'normal-2',
      'n2-cluster-1',
    ]);
    const aCluster = out.find((m) => m.logicalKey === 'n1-cluster-1');
    expect(aCluster?.a).not.toBeNull();
    expect(aCluster?.b).toBeNull();
    const bCluster = out.find((m) => m.logicalKey === 'n2-cluster-1');
    expect(bCluster?.a).toBeNull();
    expect(bCluster?.b).not.toBeNull();
  });

  test('emits warmup present only in one side with other side null', () => {
    const a = [set('warmup', 1), set('normal', 2)];
    const b = [set('normal', 1)];
    const out = matchSets(a, b);
    expect(out.map((m) => m.logicalKey)).toEqual(['warmup-1', 'normal-1']);
    const warmup = out.find((m) => m.logicalKey === 'warmup-1');
    expect(warmup?.a).not.toBeNull();
    expect(warmup?.b).toBeNull();
  });

  test('emits keys in canonical order: warmups, then normal-N with its drops', () => {
    const a = [
      set('warmup', 1),
      set('normal', 2),
      set('drop', 3),
      set('drop', 4),
      set('normal', 5),
      set('drop', 6),
    ];
    const out = matchSets(a, []);
    expect(out.map((m) => m.logicalKey)).toEqual([
      'warmup-1',
      'normal-1',
      'n1-drop-1',
      'n1-drop-2',
      'normal-2',
      'n2-drop-1',
    ]);
  });

  test('preserves distinct payload types on each side', () => {
    type APayload = { setType: 'normal'; setOrder: number; weightKg: number };
    type BPayload = { setType: 'normal'; setOrder: number; reps: number };
    const a: APayload[] = [{ setType: 'normal', setOrder: 1, weightKg: 80 }];
    const b: BPayload[] = [{ setType: 'normal', setOrder: 1, reps: 5 }];
    const out = matchSets(a, b);
    expect(out[0]?.a?.weightKg).toBe(80);
    expect(out[0]?.b?.reps).toBe(5);
  });
});
