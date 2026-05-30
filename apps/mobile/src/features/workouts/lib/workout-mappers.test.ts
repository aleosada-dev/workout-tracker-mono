import type { TFunction } from 'i18next';
import type { ExecutionExerciseInput } from '@/features/workouts/lib/execution-form';
import {
  type ExecutionListItem,
  formatSetTarget,
  reorderExercisesWithinType,
  toExecutionListItems,
} from '@/features/workouts/lib/workout-mappers';

const t = ((key: string) => key) as unknown as TFunction;

function exercise(
  overrides: Partial<ExecutionExerciseInput> & Pick<ExecutionExerciseInput, 'id'>,
): ExecutionExerciseInput {
  return {
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

    const items = toExecutionListItems(exercises, 'musculacao', t, 'pt');

    expect(items).toHaveLength(1);
    const group = supersetGroup(items[0]);
    expect(group.id).toBe('sg');
    expect(group.members.map((m) => m.letter)).toEqual(['A', 'B']);
    expect(group.members.map((m) => m.exerciseIndex)).toEqual([1, 0]);
    expect(group.restSeconds).toBe(30);
  });

  test('treats an exercise whose group id equals its own id as a single', () => {
    const items = toExecutionListItems([exercise({ id: 'x' })], 'musculacao', t, 'pt');

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('single');
  });

  test('renders a lone member with a mismatched group id as a single (defensive)', () => {
    const items = toExecutionListItems(
      [exercise({ id: 'a', supersetGroupId: 'sg' })],
      'musculacao',
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

    const group = supersetGroup(toExecutionListItems(exercises, 'musculacao', t, 'pt')[0]);

    expect(group.members.map((m) => m.letter)).toEqual(['A', 'B', 'C']);
  });

  test('preserves first-appearance order between singles and supersets and filters by type', () => {
    const exercises = [
      exercise({ id: 'single-1' }),
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
      exercise({
        id: 'warmup',
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

    const items = toExecutionListItems(exercises, 'musculacao', t, 'pt');

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

describe('reorderExercisesWithinType', () => {
  const warmup = (id: string): ExecutionExerciseInput =>
    exercise({
      id,
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

    const next = reorderExercisesWithinType(exercises, 'musculacao', ['c', 'a', 'b']);

    expect(next.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test('moves a superset as a single unit, keeping its members in order', () => {
    const exercises = [
      exercise({ id: 'single' }),
      exercise({ id: 'a', supersetGroupId: 'sg', supersetOrder: 0 }),
      exercise({ id: 'b', supersetGroupId: 'sg', supersetOrder: 1 }),
    ];

    const next = reorderExercisesWithinType(exercises, 'musculacao', ['sg', 'single']);

    expect(next.map((e) => e.id)).toEqual(['a', 'b', 'single']);
  });

  test('leaves exercises of the other type untouched in place', () => {
    const exercises = [warmup('w'), exercise({ id: 'a' }), exercise({ id: 'b' })];

    const next = reorderExercisesWithinType(exercises, 'musculacao', ['b', 'a']);

    expect(next.map((e) => e.id)).toEqual(['w', 'b', 'a']);
  });
});
