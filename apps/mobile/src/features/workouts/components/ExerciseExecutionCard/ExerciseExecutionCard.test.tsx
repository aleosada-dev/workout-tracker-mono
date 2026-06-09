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
jest.mock('@/features/shared/lib/notifications', () => ({
  cancelTimerNotification: jest.fn(),
  ensureNotificationPermission: jest.fn(),
  scheduleTimerNotification: jest.fn(),
}));
jest.mock('@/features/workouts/state/rest-timer-bridge', () => ({
  startRestTimer: jest.fn(),
}));
jest.mock('@/features/workouts/components/AliasSelector', () => ({
  AliasSelector: () => null,
}));
jest.mock('@/features/preferences/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({
    data: {
      defaultRestSeconds: null,
      weightUnit: 'kg',
      countWarmupSets: false,
      autoStartRestTimer: true,
    },
  }),
}));
jest.mock('@/features/workouts/state/active-workout-store', () => ({
  activeWorkout$: {
    lastSets: { peek: () => null },
    workoutTemplate: { peek: () => null },
    athleteId: { peek: () => null },
  },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { MeasurementType } from '@workout-tracker/domain';
import type React from 'react';
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form';
import { ExerciseExecutionCard } from '@/features/workouts/components/ExerciseExecutionCard';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

function set(id: string, measurementType: MeasurementType, durationTarget: number | null) {
  return {
    id,
    type: 'normal' as const,
    measurementType,
    roundOrder: 0,
    repsMin: null,
    repsMax: null,
    durationTarget,
    kg: '',
    reps: '',
    duration: '',
    done: false,
    lastKg: null,
    lastReps: null,
  };
}

function exercise(
  sets: ReturnType<typeof set>[],
  exerciseType: 'strength' | 'preparatory' = 'strength',
): ExecutionFormInput['exercises'][number] {
  return {
    id: 'ex',
    exerciseType,
    position: 0,
    supersetGroupId: 'sg',
    supersetOrder: 0,
    note: null,
    restSeconds: 60,
    aliasId: null,
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
  sets: ReturnType<typeof set>[],
  exerciseType: 'strength' | 'preparatory' = 'strength',
) {
  const ref: { current: UseFormReturn<ExecutionFormInput> | null } = { current: null };
  function Harness() {
    const form = useForm<ExecutionFormInput>({
      defaultValues: { exercises: [exercise(sets, exerciseType)] },
    });
    ref.current = form;
    return (
      <FormProvider {...form}>
        <ExerciseExecutionCard exerciseIndex={0} name="Supino" />
        <PortalHost />
      </FormProvider>
    );
  }
  const utils = render(<Harness />);
  fireEvent.press(utils.getByTestId('workout-execution.exercise.collapse'));
  return {
    ...utils,
    form: () => {
      if (!ref.current) throw new Error('form not initialized');
      return ref.current;
    },
  };
}

describe('<ExerciseExecutionCard />', () => {
  test('a duration-only exercise shows the time header and target, not weight/reps', () => {
    const { queryByText, getAllByText } = renderCard([set('s1', 'duration', 30)]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.duration')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.reps')).toBeNull();
    expect(getAllByText('00:30').length).toBeGreaterThan(0);
  });

  test('mixing weight_reps and reps sets unions the weight and reps headers', () => {
    const { queryByText } = renderCard([set('s1', 'weight_reps', null), set('s2', 'reps', null)]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.reps')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.duration')).toBeNull();
  });

  test('a preparatory exercise shows the set number instead of the set-type picker', () => {
    const { queryByText } = renderCard([set('s1', 'reps', null)], 'preparatory');

    expect(queryByText('1')).not.toBeNull();
    expect(queryByText('N')).toBeNull();
  });

  test('a strength exercise shows the set-type picker initial', () => {
    const { queryByText } = renderCard([set('s1', 'weight_reps', null)], 'strength');

    expect(queryByText('N')).not.toBeNull();
  });

  test('the stopwatch records the elapsed time and marks the set done on stop', async () => {
    const { getByTestId, form } = renderCard([set('s1', 'duration', null)], 'preparatory');

    fireEvent.press(getByTestId('workout-execution.set-0.timer'));
    fireEvent.press(getByTestId('workout-execution.set-0.timer'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.0.sets.0.duration')).toBe('0');
  });

  test('marking a duration set done fills the empty time field with the target', async () => {
    const { getAllByRole, form } = renderCard([set('s1', 'duration', 30)], 'preparatory');

    fireEvent.press(getAllByRole('checkbox')[0]);

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.0.sets.0.duration')).toBe('30');
  });

  test('marking a duration set done keeps a time already entered', async () => {
    const { getAllByRole, form } = renderCard([set('s1', 'duration', 30)], 'preparatory');
    form().setValue('exercises.0.sets.0.duration', '45');

    fireEvent.press(getAllByRole('checkbox')[0]);

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.0.sets.0.duration')).toBe('45');
  });

  test('marking a targetless duration set done leaves the time field empty', async () => {
    const { getAllByRole, form } = renderCard([set('s1', 'duration', null)], 'preparatory');

    fireEvent.press(getAllByRole('checkbox')[0]);

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.0.sets.0.duration')).toBe('');
  });

  test('a preparatory set is removed via the remove-set sheet when more than one exists', async () => {
    const { getByTestId, form } = renderCard(
      [set('s1', 'reps', null), set('s2', 'reps', null)],
      'preparatory',
    );

    fireEvent.press(getByTestId('workout-execution.set-0.options'));
    fireEvent.press(getByTestId('workout-execution.remove-set.confirm'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(1));
  });

  test('adding a set inherits the measurement type of the last set', async () => {
    const { getByText, form } = renderCard([set('s1', 'duration', 30)], 'preparatory');

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));
    expect(form().getValues('exercises.0.sets.1.measurementType')).toBe('duration');
  });
});
