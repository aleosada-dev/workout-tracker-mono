import type { TFunction } from 'i18next';
import type { ExecutionExerciseInput } from '@/features/workouts/lib/execution-form';
import {
  combineIntoSuperset,
  type ExecutionListItem,
  exerciseColumnLayout,
  formatSetTarget,
  reorderExercisesWithinType,
  reorderSupersetMembers,
  toExecutionListItems,
  ungroupSuperset,
  weightPlaceholder,
} from '@/features/workouts/lib/workout-mappers';

const t = ((key: string) => key) as unknown as TFunction;

function exercise(
  overrides: Partial<ExecutionExerciseInput> & Pick<ExecutionExerciseInput, 'id'>,
): ExecutionExerciseInput {
  return {
    exerciseType: 'strength',
    position: 0,
    supersetGroupId: overrides.id,
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: `var-${overrides.id}`,
      slug: 'supino-reto',
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets: [],
    ...overrides,
  };
}

function supersetGroup(item: ExecutionListItem) {
  if (item.kind !== 'superset') throw new Error('expected superset item');
  return item;
}

describe('toExecutionListItems', () => {
  test('groups exercises sharing a superset_group_id into one ordered superset item', () => {
    const exercises = [
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 1, restSeconds: 30 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 0, restSeconds: 90 }),
    ];

    const items = toExecutionListItems(exercises, 'strength', t, 'pt');

    expect(items).toHaveLength(1);
    const group = supersetGroup(items[0]);
    expect(group.id).toBe('sg');
    expect(group.members.map((m) => m.letter)).toEqual(['A', 'B']);
    expect(group.members.map((m) => m.exerciseIndex)).toEqual([1, 0]);
    expect(group.restSeconds).toBe(30);
  });

  test('treats an exercise whose group id equals its own id as a single', () => {
    const items = toExecutionListItems([exercise({ id: 'x' })], 'strength', t, 'pt');

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('single');
  });

  test('renders a lone member with a mismatched group id as a single (defensive)', () => {
    const items = toExecutionListItems(
      [exercise({ id: 'a', supersetGroupId: 'sg' })],
      'strength',
      t,
      'pt',
    );

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('single');
  });

  test('assigns letters A/B/C for a three-exercise superset', () => {
    const exercises = [
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({ id: 'c', supersetGroupId: 'sg', supersetOrder: 2 }),
    ];

    const group = supersetGroup(toExecutionListItems(exercises, 'strength', t, 'pt')[0]);

    expect(group.members.map((m) => m.letter)).toEqual(['A', 'B', 'C']);
  });

  test('preserves first-appearance order between singles and supersets and filters by type', () => {
    const exercises = [
      exercise({ id: 'single-1' }),
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({
        id: 'warmup',
        exerciseType: 'preparatory',
        variation: {
          id: 'var-warmup',
          slug: null,
          name: null,
          exercise: { slug: 'mobilidade', name: 'Mobilidade', type: 'preparatorio' },
          equipment: { slug: 'livre', preposition: 'com' },
          muscle: { slug: 'core' },
          secondaryMuscle: null,
        },
      }),
    ];

    const items = toExecutionListItems(exercises, 'strength', t, 'pt');

    expect(items.map((i) => i.kind)).toEqual(['single', 'superset']);
  });
});

describe('formatSetTarget', () => {
  test('returns an empty string when either bound is null', () => {
    expect(formatSetTarget(null, 12)).toBe('');
    expect(formatSetTarget(8, null)).toBe('');
    expect(formatSetTarget(null, null)).toBe('');
  });

  test('returns a single number when min and max are equal', () => {
    expect(formatSetTarget(10, 10)).toBe('10');
  });

  test('returns a range when min and max differ', () => {
    expect(formatSetTarget(8, 12)).toBe('8-12');
  });
});

describe('weightPlaceholder', () => {
  test('returns undefined when there is no previous load', () => {
    expect(weightPlaceholder(null, 90, 'none')).toBeUndefined();
    expect(weightPlaceholder(undefined, 90, 'none')).toBeUndefined();
  });

  test('falls back to the previous load when there is no adjustment', () => {
    expect(weightPlaceholder(100, null, 'none')).toBe('100');
    expect(weightPlaceholder(100, undefined, '2.5')).toBe('100');
  });

  test('scales the previous load by the adjustment percentage', () => {
    expect(weightPlaceholder(100, 90, 'none')).toBe('90');
    expect(weightPlaceholder(80, 105, 'none')).toBe('84');
  });

  test('rounds the scaled load per the rounding preference', () => {
    expect(weightPlaceholder(83, 90, '2.5')).toBe('75');
    expect(weightPlaceholder(83, 90, 'none')).toBe('74.7');
  });
});

describe('exerciseColumnLayout', () => {
  test('all weight_reps sets yield weight + reps without duration', () => {
    expect(
      exerciseColumnLayout([
        { measurementType: 'weight_reps' },
        { measurementType: 'weight_reps' },
      ]),
    ).toEqual({ weight: true, reps: true, duration: false });
  });

  test('a single duration set yields duration only', () => {
    expect(exerciseColumnLayout([{ measurementType: 'duration' }])).toEqual({
      weight: false,
      reps: false,
      duration: true,
    });
  });

  test('mixing reps and duration sets unions reps + duration', () => {
    expect(
      exerciseColumnLayout([{ measurementType: 'reps' }, { measurementType: 'duration' }]),
    ).toEqual({ weight: false, reps: true, duration: true });
  });

  test('mixing weight_reps and reps unions to weight + reps', () => {
    expect(
      exerciseColumnLayout([{ measurementType: 'weight_reps' }, { measurementType: 'reps' }]),
    ).toEqual({ weight: true, reps: true, duration: false });
  });
});

describe('reorderExercisesWithinType', () => {
  const warmup = (id: string): ExecutionExerciseInput =>
    exercise({
      id,
      exerciseType: 'preparatory',
      variation: {
        id: `var-${id}`,
        slug: null,
        name: null,
        exercise: { slug: 'mobilidade', name: 'Mobilidade', type: 'preparatorio' },
        equipment: { slug: 'livre', preposition: 'com' },
        muscle: { slug: 'core' },
        secondaryMuscle: null,
      },
    });

  test('reorders single exercises and reassigns position', () => {
    const exercises = [exercise({ id: 'a' }), exercise({ id: 'b' }), exercise({ id: 'c' })];

    const next = reorderExercisesWithinType(exercises, 'strength', ['c', 'a', 'b']);

    expect(next.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test('moves a superset as a single unit, keeping its members in order', () => {
    const exercises = [
      exercise({ id: 'single' }),
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
    ];

    const next = reorderExercisesWithinType(exercises, 'strength', ['sg', 'single']);

    expect(next.map((e) => e.id)).toEqual(['a', 'b', 'single']);
  });

  test('leaves exercises of the other type untouched in place', () => {
    const exercises = [warmup('w'), exercise({ id: 'a' }), exercise({ id: 'b' })];

    const next = reorderExercisesWithinType(exercises, 'strength', ['b', 'a']);

    expect(next.map((e) => e.id)).toEqual(['w', 'b', 'a']);
  });
});

describe('combineIntoSuperset', () => {
  test('groups two singles into one superset with shared group id and A/B order', () => {
    const exercises = [exercise({ id: 'a' }), exercise({ id: 'b' }), exercise({ id: 'c' })];

    const next = combineIntoSuperset(exercises, ['a', 'b'], 'sg');

    const a = next.find((e) => e.id === 'a');
    const b = next.find((e) => e.id === 'b');
    expect(a?.supersetGroupId).toBe('sg');
    expect(b?.supersetGroupId).toBe('sg');
    expect(a?.supersetOrder).toBe(0);
    expect(b?.supersetOrder).toBe(1);
    expect(next.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test('uses a group id distinct from every member id so isSupersetGroup holds', () => {
    const exercises = [exercise({ id: 'a' }), exercise({ id: 'b' })];

    const next = combineIntoSuperset(exercises, ['a', 'b'], 'sg');

    expect(next.every((e) => e.supersetGroupId !== e.id)).toBe(true);
  });

  test('makes a non-contiguous selection contiguous at the earliest position', () => {
    const exercises = [exercise({ id: 'a' }), exercise({ id: 'middle' }), exercise({ id: 'b' })];

    const next = combineIntoSuperset(exercises, ['a', 'b'], 'sg');

    expect(next.map((e) => e.id)).toEqual(['a', 'b', 'middle']);
    expect(next.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test('merges an existing 2-member superset plus a single into a 3-member superset', () => {
    const exercises = [
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({ id: 'c' }),
    ];

    const next = combineIntoSuperset(exercises, ['a', 'b', 'c'], 'sg2');

    const group = supersetGroup(toExecutionListItems(next, 'strength', t, 'pt')[0]);
    expect(group.members.map((m) => m.letter)).toEqual(['A', 'B', 'C']);
    expect(next.every((e) => e.supersetGroupId === 'sg2')).toBe(true);
    expect(next.every((e) => e.supersetOrder === [0, 1, 2][next.indexOf(e)])).toBe(true);
  });
});

describe('ungroupSuperset', () => {
  test('turns every member back into a single and reassigns position', () => {
    const exercises = [
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({ id: 'c' }),
    ];

    const next = ungroupSuperset(exercises, 'sg');

    expect(next.every((e) => e.supersetGroupId === e.id)).toBe(true);
    expect(next.every((e) => e.supersetOrder === 0)).toBe(true);
    expect(next.map((e) => e.position)).toEqual([0, 1, 2]);
    const items = toExecutionListItems(next, 'strength', t, 'pt');
    expect(items.map((i) => i.kind)).toEqual(['single', 'single', 'single']);
  });
});

describe('reorderSupersetMembers', () => {
  test('reorders members and reassigns supersetOrder while keeping the group id', () => {
    const exercises = [
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({ id: 'c', supersetGroupId: 'sg', supersetOrder: 2 }),
    ];

    const next = reorderSupersetMembers(exercises, ['c', 'a', 'b']);

    expect(next.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((e) => e.supersetOrder)).toEqual([0, 1, 2]);
    expect(next.every((e) => e.supersetGroupId === 'sg')).toBe(true);
  });
});
