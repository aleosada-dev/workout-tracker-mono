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
jest.mock('@/features/workouts/state/rest-timer-bridge', () => ({
  startRestTimer: jest.fn(),
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
    lastLog: { peek: () => null },
    workoutTemplate: { peek: () => null },
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
import type React from 'react';
import { FormProvider, type UseFormReturn, useForm } from 'react-hook-form';
import { SupersetExecutionCard } from '@/features/workouts/components/SupersetExecutionCard';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import type { SupersetMember } from '@/features/workouts/lib/workout-mappers';
import { startRestTimer } from '@/features/workouts/state/rest-timer-bridge';

const MEMBERS: SupersetMember[] = [
  {
    exerciseIndex: 0,
    variationId: 'va',
    letter: 'A',
    name: 'Exercise A',
    variationName: null,
    note: null,
    restSeconds: 0,
  },
  {
    exerciseIndex: 1,
    variationId: 'vb',
    letter: 'B',
    name: 'Exercise B',
    variationName: null,
    note: null,
    restSeconds: 60,
  },
];

function member(index: number, restSeconds: number): ExecutionFormInput['exercises'][number] {
  return {
    id: `ex-${index}`,
    exerciseType: 'strength',
    position: index,
    supersetGroupId: 'sg',
    supersetOrder: index,
    note: null,
    restSeconds,
    variation: {
      id: index === 0 ? 'va' : 'vb',
      slug: null,
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets: [
      {
        id: `s-${index}`,
        type: 'normal',
        measurementType: 'weight_reps',
        repsMin: null,
        repsMax: null,
        durationTarget: null,
        kg: '',
        reps: '',
        duration: '',
        done: false,
        lastKg: null,
        lastReps: null,
      },
    ],
  };
}

function renderCard() {
  const ref: { current: UseFormReturn<ExecutionFormInput> | null } = { current: null };
  function Harness() {
    const form = useForm<ExecutionFormInput>({
      defaultValues: { exercises: [member(0, 0), member(1, 60)] },
    });
    ref.current = form;
    return (
      <FormProvider {...form}>
        <SupersetExecutionCard members={MEMBERS} restSeconds={60} />
        <PortalHost />
      </FormProvider>
    );
  }
  const utils = render(<Harness />);
  fireEvent.press(utils.getByTestId('workout-execution.superset.collapse'));
  return {
    ...utils,
    form: () => {
      if (!ref.current) throw new Error('form not initialized');
      return ref.current;
    },
  };
}

describe('<SupersetExecutionCard />', () => {
  beforeEach(() => {
    (startRestTimer as jest.Mock).mockClear();
  });

  test('the shared checkbox marks the set done across all members and starts the rest timer once', async () => {
    const { getByTestId, form } = renderCard();

    fireEvent.press(getByTestId('workout-execution.superset.set-0.done'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.1.sets.0.done')).toBe(true);
    expect(startRestTimer).toHaveBeenCalledTimes(1);
    expect(startRestTimer).toHaveBeenCalledWith(60);
  });

  test('add set appends a set to every member', async () => {
    const { getByText, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));
    expect(form().getValues('exercises.1.sets')).toHaveLength(2);
  });

  test('deleting the whole set removes that position from every member', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.type'));
    await waitFor(() =>
      expect(getByText('workoutExecutionScreen.setTypePicker.removeSupersetSet')).toBeTruthy(),
    );
    fireEvent.press(getByText('workoutExecutionScreen.setTypePicker.removeSupersetSet'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(1));
    expect(form().getValues('exercises.1.sets')).toHaveLength(1);
  });

  test('deleting the exercise set removes only that member position', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.type'));
    await waitFor(() =>
      expect(getByText('workoutExecutionScreen.setTypePicker.removeExerciseSet')).toBeTruthy(),
    );
    fireEvent.press(getByText('workoutExecutionScreen.setTypePicker.removeExerciseSet'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(1));
    expect(form().getValues('exercises.1.sets')).toHaveLength(2);
  });

  test('changing a set type updates only that member', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.type'));
    await waitFor(() => expect(getByText('sets.warmup.token — sets.warmup.label')).toBeTruthy());
    fireEvent.press(getByText('sets.warmup.token — sets.warmup.label'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.type')).toBe('warmup'));
    expect(form().getValues('exercises.1.sets.0.type')).toBe('normal');
  });
});
