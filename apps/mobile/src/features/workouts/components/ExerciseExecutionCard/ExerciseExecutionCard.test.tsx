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
const mockPreferencesData: {
  defaultRestSeconds: number | null;
  weightUnit: string;
  countWarmupSets: boolean;
  autoStartRestTimer: boolean;
} = {
  defaultRestSeconds: null,
  weightUnit: 'kg',
  countWarmupSets: false,
  autoStartRestTimer: true,
};
jest.mock('@/features/preferences/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({ data: mockPreferencesData }),
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

function set(
  id: string,
  measurementType: MeasurementType,
  durationTarget: number | null,
  distanceTarget: number | null = null,
) {
  return {
    id,
    type: 'normal' as const,
    measurementType,
    roundOrder: 0,
    repsMin: null,
    repsMax: null,
    durationTarget,
    distanceTarget,
    kg: '',
    reps: '',
    duration: '',
    distance: '',
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
  afterEach(() => {
    mockPreferencesData.defaultRestSeconds = null;
  });

  test('falls back to the default rest preference for the rest indicator when no per-exercise rest is set', () => {
    mockPreferencesData.defaultRestSeconds = 90;
    const { queryByText } = renderCard([set('s1', 'weight_reps', null)]);

    expect(queryByText('1min 30s')).not.toBeNull();
  });

  test('shows no rest indicator when neither a per-exercise rest nor a default preference is set', () => {
    const { queryByText } = renderCard([set('s1', 'weight_reps', null)]);

    expect(queryByText('1min 30s')).toBeNull();
  });

  test('a duration-only exercise shows the time header and target, not weight/reps', () => {
    const { queryByText, getAllByText } = renderCard([set('s1', 'duration', 30)]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.duration')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.reps')).toBeNull();
    expect(getAllByText('00:30').length).toBeGreaterThan(0);
  });

  test('a distance exercise shows the distance header and a distance input, not weight/reps', () => {
    const { queryByText, getByTestId } = renderCard([set('s1', 'distance', null)]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.distance')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).toBeNull();
    expect(getByTestId('workout-execution.set-0.distance')).toBeTruthy();
  });

  test('a distance input stores meters and converts from km via the header unit toggle', () => {
    const { getByTestId, form } = renderCard([set('s1', 'distance', null)]);

    fireEvent.changeText(getByTestId('workout-execution.set-0.distance'), '800');
    expect(form().getValues('exercises.0.sets.0.distance')).toBe('800');

    fireEvent.press(getByTestId('workout-execution.exercise.distance-unit'));
    fireEvent.changeText(getByTestId('workout-execution.set-0.distance'), '1.5');
    expect(form().getValues('exercises.0.sets.0.distance')).toBe('1500');
  });

  test('a distance set whose target is over 1000m defaults the header to the km unit', () => {
    const { getByTestId } = renderCard([set('s1', 'distance', null, 2000)]);

    expect(getByTestId('workout-execution.exercise.distance-unit')).toHaveTextContent('km');
  });

  test('a distance target under 1000m keeps the header on the m unit', () => {
    const { getByTestId } = renderCard([set('s1', 'distance', null, 800)]);

    expect(getByTestId('workout-execution.exercise.distance-unit')).toHaveTextContent('m');
  });

  test('the header unit toggle applies to a newly added distance set', () => {
    const { getByTestId, getByText, form } = renderCard([set('s1', 'distance', null)]);

    fireEvent.press(getByTestId('workout-execution.exercise.distance-unit'));
    expect(getByTestId('workout-execution.exercise.distance-unit')).toHaveTextContent('km');

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));

    fireEvent.changeText(getByTestId('workout-execution.set-1.distance'), '1.5');
    expect(form().getValues('exercises.0.sets.1.distance')).toBe('1500');
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
    expect(queryByText('sets.normal.token')).toBeNull();
  });

  test('a strength exercise shows the set-type picker initial', () => {
    const { queryByText } = renderCard([set('s1', 'weight_reps', null)], 'strength');

    expect(queryByText('sets.normal.token')).not.toBeNull();
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
