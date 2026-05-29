import { describe, expect, test } from 'bun:test';
import { assignLogicalKeys } from './logical-key';

const set = (setType: 'warmup' | 'normal' | 'drop' | 'cluster', setOrder: number) => ({
  setType,
  setOrder,
});

describe('assignLogicalKeys', () => {
  test('returns empty array for empty input', () => {
    expect(assignLogicalKeys([])).toEqual([]);
  });

  test('labels sequential normals as normal-1..normal-N', () => {
    const out = assignLogicalKeys([set('normal', 1), set('normal', 2), set('normal', 3)]);
    expect(out.map((r) => r.logicalKey)).toEqual(['normal-1', 'normal-2', 'normal-3']);
  });

  test('labels warmups as warmup-1..warmup-W before any normal', () => {
    const out = assignLogicalKeys([
      set('warmup', 1),
      set('warmup', 2),
      set('normal', 3),
      set('normal', 4),
    ]);
    expect(out.map((r) => r.logicalKey)).toEqual(['warmup-1', 'warmup-2', 'normal-1', 'normal-2']);
  });

  test('labels drops as n{normal}-drop-{d} and resets on new normal', () => {
    const out = assignLogicalKeys([
      set('normal', 1),
      set('drop', 2),
      set('drop', 3),
      set('normal', 4),
      set('drop', 5),
    ]);
    expect(out.map((r) => r.logicalKey)).toEqual([
      'normal-1',
      'n1-drop-1',
      'n1-drop-2',
      'normal-2',
      'n2-drop-1',
    ]);
  });

  test('labels clusters as n{normal}-cluster-{c} and resets on new normal', () => {
    const out = assignLogicalKeys([
      set('normal', 1),
      set('cluster', 2),
      set('normal', 3),
      set('cluster', 4),
    ]);
    expect(out.map((r) => r.logicalKey)).toEqual([
      'normal-1',
      'n1-cluster-1',
      'normal-2',
      'n2-cluster-1',
    ]);
  });

  test('preserves original input order in the output', () => {
    const input = [set('normal', 1), set('warmup', 2), set('normal', 3)];
    const out = assignLogicalKeys(input);
    expect(out.map((r) => r.logicalKey)).toEqual(['normal-1', 'warmup-1', 'normal-2']);
  });

  test('labels warmups with high setOrder as warmup-1 regardless of position', () => {
    const out = assignLogicalKeys([set('normal', 1), set('normal', 2), set('warmup', 99)]);
    expect(out.map((r) => r.logicalKey)).toEqual(['normal-1', 'normal-2', 'warmup-1']);
  });

  test('preserves additional payload fields from the input', () => {
    const out = assignLogicalKeys([
      { setType: 'normal' as const, setOrder: 1, weightKg: 80, reps: 5 },
    ]);
    expect(out[0]).toEqual({
      setType: 'normal',
      setOrder: 1,
      weightKg: 80,
      reps: 5,
      logicalKey: 'normal-1',
    });
  });

  test('labels drop/cluster appearing before any normal as n0-*', () => {
    const out = assignLogicalKeys([set('drop', 1), set('normal', 2)]);
    expect(out.map((r) => r.logicalKey)).toEqual(['n0-drop-1', 'normal-1']);
  });

  test('labels a lone warmup as warmup-1', () => {
    const out = assignLogicalKeys([set('warmup', 1)]);
    expect(out.map((r) => r.logicalKey)).toEqual(['warmup-1']);
  });
});
