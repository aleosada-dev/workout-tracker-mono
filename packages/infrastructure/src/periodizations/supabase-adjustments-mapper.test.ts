import { describe, expect, test } from 'bun:test';
import { type AdjustmentRow, toAdjustment } from './supabase-adjustments-mapper';

function row(overrides: Partial<AdjustmentRow> = {}): AdjustmentRow {
  return {
    id: 'adj-1',
    periodization_id: 'per-1',
    cycle_start: 2,
    cycle_end: null,
    cycle_every: 1,
    type: 'workout_override',
    payload: {},
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toAdjustment', () => {
  test('translates the legacy workout_override payload (activityIndex + loadPercent → load)', () => {
    const adjustment = toAdjustment(
      row({
        payload: {
          type: 'workout_override',
          anchorDate: '2026-05-28',
          workoutId: 'w1',
          activityIndex: 0,
          ops: [
            {
              kind: 'change_set_value',
              variationId: 'v1',
              setIndex: 0,
              field: 'loadPercent',
              value: 105,
            },
            {
              kind: 'change_set_value',
              variationId: 'v1',
              setIndex: 1,
              field: 'repsMax',
              value: 6,
            },
          ],
        },
      }),
    );

    expect(adjustment).not.toBeNull();
    expect(adjustment?.type).toBe('workout_override');
    if (adjustment?.payload.type !== 'workout_override')
      throw new Error('expected workout_override');
    expect(adjustment.payload.positionInDay).toBe(0);
    expect(adjustment.payload.ops).toEqual([
      {
        kind: 'change_set_value',
        variationId: 'v1',
        setIndex: 0,
        field: 'load',
        value: 105,
      },
      { kind: 'change_set_value', variationId: 'v1', setIndex: 1, field: 'repsMax', value: 6 },
    ]);
  });

  test('routes legacy set loadPercent by set type (normal → loadPercent, drop → loadPercentOfPrevious)', () => {
    const adjustment = toAdjustment(
      row({
        payload: {
          type: 'workout_override',
          workoutId: 'w1',
          activityIndex: 0,
          ops: [
            {
              kind: 'add_set',
              variationId: 'v1',
              position: 0,
              set: {
                setType: 'normal',
                measurementType: 'weight_reps',
                repsMin: 8,
                repsMax: 12,
                loadPercent: 90,
              },
            },
            {
              kind: 'add_set',
              variationId: 'v1',
              position: 1,
              set: {
                setType: 'drop',
                measurementType: 'weight_reps',
                repsMin: 8,
                repsMax: 12,
                loadPercent: 80,
              },
            },
          ],
        },
      }),
    );
    if (adjustment?.payload.type !== 'workout_override')
      throw new Error('expected workout_override');
    const [normalOp, dropOp] = adjustment.payload.ops;
    if (normalOp?.kind !== 'add_set' || dropOp?.kind !== 'add_set')
      throw new Error('expected add_set ops');
    expect(normalOp.set.loadPercent).toBe(90);
    expect(normalOp.set.loadPercentOfPrevious).toBeNull();
    expect(dropOp.set.loadPercent).toBeNull();
    expect(dropOp.set.loadPercentOfPrevious).toBe(80);
  });

  test('maps a note payload', () => {
    const adjustment = toAdjustment(
      row({ type: 'note', payload: { type: 'note', workoutId: 'w1', text: 'Deload' } }),
    );
    expect(adjustment?.type).toBe('note');
    if (adjustment?.payload.type !== 'note') throw new Error('expected note');
    expect(adjustment.payload.text).toBe('Deload');
  });

  test('drops unsupported adjustment types', () => {
    expect(toAdjustment(row({ type: 'stop_until', payload: { type: 'stop_until' } }))).toBeNull();
    expect(
      toAdjustment(row({ type: 'extra_activity', payload: { type: 'extra_activity' } })),
    ).toBeNull();
  });

  test('drops a workout_override missing workoutId or activityIndex', () => {
    expect(
      toAdjustment(row({ payload: { type: 'workout_override', activityIndex: 0, ops: [] } })),
    ).toBeNull();
    expect(
      toAdjustment(row({ payload: { type: 'workout_override', workoutId: 'w1', ops: [] } })),
    ).toBeNull();
  });

  test('drops malformed ops while keeping valid ones', () => {
    const adjustment = toAdjustment(
      row({
        payload: {
          type: 'workout_override',
          workoutId: 'w1',
          activityIndex: 0,
          ops: [
            {
              kind: 'change_set_value',
              variationId: 'v1',
              setIndex: 0,
              field: 'unknown',
              value: 1,
            },
            { kind: 'remove_exercise', variationId: 'v2' },
          ],
        },
      }),
    );
    if (adjustment?.payload.type !== 'workout_override')
      throw new Error('expected workout_override');
    expect(adjustment.payload.ops).toEqual([{ kind: 'remove_exercise', variationId: 'v2' }]);
  });
});
