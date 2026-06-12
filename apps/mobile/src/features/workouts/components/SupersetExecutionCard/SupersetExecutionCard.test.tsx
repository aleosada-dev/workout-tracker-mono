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
    aliasId: null,
    letter: 'A',
    name: 'Exercise A',
    variationName: null,
    note: null,
    restSeconds: 0,
    alternative: null,
  },
  {
    exerciseIndex: 1,
    variationId: 'vb',
    aliasId: null,
    letter: 'B',
    name: 'Exercise B',
    variationName: null,
    note: null,
    restSeconds: 60,
    alternative: null,
  },
];

function member(
  index: number,
  restSeconds: number,
  measurementType: ExecutionFormInput['exercises'][number]['sets'][number]['measurementType'] = 'weight_reps',
): ExecutionFormInput['exercises'][number] {
  return {
    id: `ex-${index}`,
    exerciseType: 'strength',
    position: index,
    supersetGroupId: 'sg',
    supersetOrder: index,
    note: null,
    restSeconds,
    aliasId: null,
    variation: {
      id: index === 0 ? 'va' : 'vb',
      slug: null,
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets: [
      {
        id: `s-${index}`,
        type: 'normal',
        measurementType,
        roundOrder: 0,
        repsMin: null,
        repsMax: null,
        durationTarget: null,
        distanceTarget: null,
        kg: '',
        reps: '',
        duration: '',
        distance: '',
        done: false,
        lastKg: null,
        lastReps: null,
      },
    ],
  };
}

function renderCard(exercises: ExecutionFormInput['exercises'] = [member(0, 0), member(1, 60)]) {
  const ref: { current: UseFormReturn<ExecutionFormInput> | null } = { current: null };
  function Harness() {
    const form = useForm<ExecutionFormInput>({
      defaultValues: { exercises },
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

    fireEvent.press(getByTestId('workout-execution.superset.round-0.done'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.done')).toBe(true));
    expect(form().getValues('exercises.1.sets.0.done')).toBe(true);
    expect(startRestTimer).toHaveBeenCalledTimes(1);
    expect(startRestTimer).toHaveBeenCalledWith(60);
  });

  test('renders each member by its measurement type (distance gets a distance input, no weight)', () => {
    const { getByTestId, queryByText } = renderCard([
      member(0, 0, 'distance'),
      member(1, 60, 'distance'),
    ]);

    expect(queryByText('workoutExecutionScreen.exercise.headers.distance')).not.toBeNull();
    expect(queryByText('workoutExecutionScreen.exercise.headers.weight')).toBeNull();
    expect(getByTestId('workout-execution.superset.set-0.exercise-0.distance')).toBeTruthy();
  });

  test('a distance input stores the value in meters, converting from km', () => {
    const { getByTestId, form } = renderCard([member(0, 0, 'distance'), member(1, 60, 'distance')]);

    const input = getByTestId('workout-execution.superset.set-0.exercise-0.distance');
    fireEvent.press(getByTestId('workout-execution.superset.distance-unit'));
    fireEvent.changeText(input, '5');

    expect(form().getValues('exercises.0.sets.0.distance')).toBe('5000');
  });

  test('add set defaults to one normal set per member', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.confirm')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));
    expect(form().getValues('exercises.1.sets')).toHaveLength(2);
    expect(form().getValues('exercises.0.sets.1.type')).toBe('normal');
    expect(form().getValues('exercises.1.sets.1.type')).toBe('normal');
  });

  test('add set composes an asymmetric round (A normal, B normal + drop)', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.add-entry')).toBeTruthy());

    fireEvent.press(getByTestId('superset-add-sets.add-entry'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.exercise.1'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.type.drop'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.1.sets')).toHaveLength(3));
    expect(form().getValues('exercises.0.sets')).toHaveLength(2);
    expect(form().getValues('exercises.1.sets.2.type')).toBe('drop');
  });

  test('a composed série groups all its sets under one checkbox', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.add-entry')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.add-entry'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.exercise.1'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.type.drop'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));
    await waitFor(() => expect(form().getValues('exercises.1.sets')).toHaveLength(3));

    fireEvent.press(getByTestId('workout-execution.superset.round-1.done'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.1.done')).toBe(true));
    expect(form().getValues('exercises.1.sets.1.done')).toBe(true);
    expect(form().getValues('exercises.1.sets.2.done')).toBe(true);
    expect(form().getValues('exercises.1.sets.2.roundOrder')).toBe(
      form().getValues('exercises.1.sets.1.roundOrder'),
    );
  });

  test('composes A + B + A into one série with two A sets in the same round', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.add-entry')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.add-entry'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(3));
    expect(form().getValues('exercises.1.sets')).toHaveLength(2);
    expect(form().getValues('exercises.0.sets.1.roundOrder')).toBe(1);
    expect(form().getValues('exercises.0.sets.2.roundOrder')).toBe(1);
  });

  test('deleting the whole set removes that position from every member', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.confirm')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.confirm'));
    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));

    fireEvent.press(getByTestId('workout-execution.superset.set-1.exercise-0.letter'));
    await waitFor(() => expect(getByTestId('superset-add-sets.delete-round')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.delete-round'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(1));
    expect(form().getValues('exercises.1.sets')).toHaveLength(1);
  });

  test('pressing a set type opens the round editor and removing its line deletes only that member', async () => {
    const { getByText, getByTestId, form } = renderCard();

    fireEvent.press(getByText('workoutExecutionScreen.exercise.addSet'));
    await waitFor(() => expect(getByTestId('superset-add-sets.confirm')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.confirm'));
    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(2));

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.type'));
    await waitFor(() => expect(getByTestId('superset-add-sets.entry.0.remove')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.entry.0.remove'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.0.sets')).toHaveLength(1));
    expect(form().getValues('exercises.1.sets')).toHaveLength(2);
  });

  test('editing a série pre-fills the sheet and saves changes', async () => {
    const { getByTestId, form } = renderCard();

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.letter'));
    await waitFor(() => expect(getByTestId('superset-add-sets.confirm')).toBeTruthy());

    fireEvent.press(getByTestId('superset-add-sets.add-entry'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.exercise.1'));
    fireEvent.press(getByTestId('superset-add-sets.entry.2.type.drop'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.1.sets')).toHaveLength(2));
    expect(form().getValues('exercises.0.sets')).toHaveLength(1);
    expect(form().getValues('exercises.1.sets.1.type')).toBe('drop');
    expect(form().getValues('exercises.1.sets.1.roundOrder')).toBe(0);
  });

  test('changing a set type through the round editor updates only that member', async () => {
    const { getByTestId, form } = renderCard();

    fireEvent.press(getByTestId('workout-execution.superset.set-0.exercise-0.type'));
    await waitFor(() => expect(getByTestId('superset-add-sets.entry.0.type.warmup')).toBeTruthy());
    fireEvent.press(getByTestId('superset-add-sets.entry.0.type.warmup'));
    fireEvent.press(getByTestId('superset-add-sets.confirm'));

    await waitFor(() => expect(form().getValues('exercises.0.sets.0.type')).toBe('warmup'));
    expect(form().getValues('exercises.1.sets.0.type')).toBe('normal');
  });

  test("pressing member A's swap shows A's alternative while B is unchanged", () => {
    const membersWithAlt: SupersetMember[] = [
      { ...MEMBERS[0], alternative: { name: 'Crucifixo', variationName: 'Crucifixo na máquina' } },
      MEMBERS[1],
    ];
    const exerciseA = member(0, 0);
    const exercises: ExecutionFormInput['exercises'] = [
      {
        ...exerciseA,
        usingAlternative: false,
        alternative: {
          id: 'alt-a',
          note: null,
          restSeconds: null,
          aliasId: null,
          variation: {
            ...exerciseA.variation,
            id: 'va-alt',
            exercise: { slug: 'crucifixo', name: 'Crucifixo', type: 'musculacao' },
          },
          sets: exerciseA.sets.map((s) => ({ ...s, id: 'alt-a-s0' })),
        },
      },
      member(1, 60),
    ];

    function Harness() {
      const form = useForm<ExecutionFormInput>({ defaultValues: { exercises } });
      return (
        <FormProvider {...form}>
          <SupersetExecutionCard members={membersWithAlt} restSeconds={60} />
          <PortalHost />
        </FormProvider>
      );
    }
    const { getByTestId, queryByText } = render(<Harness />);
    fireEvent.press(getByTestId('workout-execution.superset.collapse'));

    expect(queryByText('Crucifixo na máquina')).toBeNull();

    fireEvent.press(getByTestId('workout-execution.exercise-0.swap-alternative'));

    expect(queryByText('Crucifixo na máquina')).not.toBeNull();
    expect(queryByText('Exercise B')).not.toBeNull();
  });
});
