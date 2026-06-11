jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  const fade = { duration: () => fade, delay: () => fade };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    FadeIn: fade,
    FadeOut: fade,
    View,
    createAnimatedComponent: (c: unknown) => c,
    NativeOnlyAnimatedView: passthrough,
  };
});
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return {
    ...actual,
    FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
  };
});
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${n++}` };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
const mockPreferences = { autoFillReps: true };
jest.mock('@/features/preferences/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({ data: mockPreferences }),
}));

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form';
import { ExerciseBuilderCard } from '@/features/workouts/components/ExerciseBuilderCard';
import {
  type BuilderSetInput,
  buildBuilderSet,
  type WorkoutFormInput,
} from '@/features/workouts/lib/builder-form';

function set(
  id: string,
  measurementType: BuilderSetInput['measurementType'],
  overrides: Partial<BuilderSetInput> = {},
): BuilderSetInput {
  return { ...buildBuilderSet(id, 'normal', measurementType, 0), ...overrides };
}

function exercise(
  sets: BuilderSetInput[],
  exerciseType: 'strength' | 'preparatory' = 'strength',
): WorkoutFormInput['exercises'][number] {
  return {
    id: 'ex',
    exerciseType,
    position: 0,
    supersetGroupId: 'ex',
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: 'va',
      slug: null,
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets,
  };
}

function renderCard(
  sets: BuilderSetInput[],
  exerciseType: 'strength' | 'preparatory' = 'strength',
) {
  const ref: { current: UseFormReturn<WorkoutFormInput> | null } = { current: null };
  function Harness() {
    const form = useForm<WorkoutFormInput>({
      defaultValues: {
        name: 'Treino A',
        description: '',
        exercises: [exercise(sets, exerciseType)],
      },
    });
    ref.current = form;
    return (
      <FormProvider {...form}>
        <ExerciseBuilderCard exerciseIndex={0} name="Supino" />
        <PortalHost />
      </FormProvider>
    );
  }
  const utils = render(<Harness />);
  fireEvent.press(utils.getByTestId('workout-form.exercise.collapse'));
  return {
    ...utils,
    form: () => {
      if (!ref.current) throw new Error('form not initialized');
      return ref.current;
    },
  };
}

describe('<ExerciseBuilderCard />', () => {
  beforeEach(() => {
    mockPreferences.autoFillReps = true;
  });

  test('weight_reps sets show min/max reps inputs bound to the form', () => {
    const { getByTestId, queryByText, form } = renderCard([set('s1', 'weight_reps')]);

    expect(queryByText('workoutFormScreen.exercise.headers.reps')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).toBeNull();

    fireEvent.changeText(getByTestId('workout-form.set-0.reps-min'), '8');
    fireEvent.changeText(getByTestId('workout-form.set-0.reps-max'), '12');
    expect(form().getValues('exercises.0.sets.0.repsMin')).toBe('8');
    expect(form().getValues('exercises.0.sets.0.repsMax')).toBe('12');
  });

  test('blurring a reps field fills the following empty sets, leaving filled ones untouched', () => {
    const { getByTestId, form } = renderCard([
      set('s1', 'weight_reps'),
      set('s2', 'weight_reps', { roundOrder: 1, repsMin: '5' }),
      set('s3', 'weight_reps', { roundOrder: 2 }),
    ]);

    fireEvent.changeText(getByTestId('workout-form.set-0.reps-min'), '8');
    fireEvent(getByTestId('workout-form.set-0.reps-min'), 'blur');

    // s2 already had a min, so it is preserved; s3 was empty and gets filled.
    expect(form().getValues('exercises.0.sets.1.repsMin')).toBe('5');
    expect(form().getValues('exercises.0.sets.2.repsMin')).toBe('8');
    // repsMax is independent and stays empty.
    expect(form().getValues('exercises.0.sets.1.repsMax')).toBe('');
    expect(form().getValues('exercises.0.sets.2.repsMax')).toBe('');
  });

  test('does not autofill when the preference is disabled', () => {
    mockPreferences.autoFillReps = false;
    const { getByTestId, form } = renderCard([
      set('s1', 'weight_reps'),
      set('s2', 'weight_reps', { roundOrder: 1 }),
    ]);

    fireEvent.changeText(getByTestId('workout-form.set-0.reps-min'), '8');
    fireEvent(getByTestId('workout-form.set-0.reps-min'), 'blur');

    expect(form().getValues('exercises.0.sets.1.repsMin')).toBe('');
  });

  test('a duration set shows the duration target cell', () => {
    const { getByTestId, queryByText } = renderCard([set('s1', 'duration')]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.duration')).not.toBeNull();
    expect(queryByText('workoutFormScreen.exercise.headers.reps')).toBeNull();
    expect(getByTestId('workout-form.set-0.duration')).toBeTruthy();
  });

  test('a distance set stores meters and converts km via the unit toggle', () => {
    const { getByTestId, form } = renderCard([set('s1', 'distance')]);

    fireEvent.changeText(getByTestId('workout-form.set-0.distance'), '800');
    expect(form().getValues('exercises.0.sets.0.distance')).toBe('800');

    fireEvent.press(getByTestId('workout-form.exercise.distance-unit'));
    fireEvent.changeText(getByTestId('workout-form.set-0.distance'), '1.5');
    expect(form().getValues('exercises.0.sets.0.distance')).toBe('1500');
  });

  test('shows the % column only when a drop/cluster set exists, with input on the linked row only', () => {
    const noDrop = renderCard([set('s1', 'weight_reps')]);
    expect(noDrop.queryByText('workoutFormScreen.exercise.headers.loadPercent')).toBeNull();
    noDrop.unmount();

    const withDrop = renderCard([
      set('s1', 'weight_reps'),
      set('s2', 'weight_reps', { type: 'drop', linkedSetId: 's1' }),
    ]);
    expect(withDrop.queryByText('workoutFormScreen.exercise.headers.loadPercent')).not.toBeNull();
    expect(withDrop.queryByTestId('workout-form.set-0.load-percent')).toBeNull();
    expect(withDrop.getByTestId('workout-form.set-1.load-percent')).toBeTruthy();

    fireEvent.changeText(withDrop.getByTestId('workout-form.set-1.load-percent'), '80');
    expect(withDrop.form().getValues('exercises.0.sets.1.loadPercent')).toBe('80');
  });

  test('adding a set appends a normal set with the next round order', () => {
    const { getByText, form } = renderCard([set('s1', 'weight_reps')]);

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));

    const sets = form().getValues('exercises.0.sets');
    expect(sets).toHaveLength(2);
    expect(sets[1]).toMatchObject({ type: 'normal', roundOrder: 1, repsMin: '', repsMax: '' });
  });

  test('preparatory exercises show a removable numbered row instead of the set type', () => {
    const { queryByTestId, getByTestId } = renderCard(
      [set('s1', 'duration'), set('s2', 'duration', { roundOrder: 1 })],
      'preparatory',
    );

    expect(queryByTestId('workout-form.set-0.type')).toBeNull();
    expect(getByTestId('workout-form.set-0.options')).toBeTruthy();
  });

  test('exposes separate note and rest editors, with undefined rest by default', () => {
    const { getByTestId, queryByText } = renderCard([set('s1', 'weight_reps')]);
    expect(getByTestId('workout-form.exercise.note')).toBeTruthy();
    expect(getByTestId('workout-form.exercise.rest')).toBeTruthy();
    expect(queryByText('workoutFormScreen.exercise.restUndefined')).not.toBeNull();
  });
});
