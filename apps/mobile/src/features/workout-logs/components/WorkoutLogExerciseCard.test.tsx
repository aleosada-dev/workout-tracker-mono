jest.mock('react-i18next', () => {
  const { createI18nMock } = jest.requireActual('@/features/test-utils/react-i18next');
  return createI18nMock({
    'sets.warmup.token': 'W',
    'sets.normal.token': 'N',
    'workoutLogDetail.superset': 'Supersérie',
  });
});
jest.mock('@/features/preferences/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({ data: { weight: { unit: 'kg', rounding: null } } }),
}));

import { render } from '@testing-library/react-native';
import type { WorkoutLogDetailExercise } from '@/features/workout-logs/api/workout-logs';
import { WorkoutLogExerciseCard } from '@/features/workout-logs/components/WorkoutLogExerciseCard';
import { WorkoutLogSupersetCard } from '@/features/workout-logs/components/WorkoutLogSupersetCard';

const exercise: WorkoutLogDetailExercise = {
  variationId: 'v-1',
  exerciseName: 'Bench Press',
  variationName: 'Barbell',
  exerciseType: 'strength',
  position: 0,
  supersetGroupId: 'g-1',
  note: 'felt strong',
  restSeconds: 90,
  sets: [
    {
      setOrder: 0,
      roundOrder: 0,
      setType: 'warmup',
      measurementType: 'weight_reps',
      weightKg: 40,
      reps: 12,
      repsMin: null,
      repsMax: null,
      durationSeconds: null,
    },
    {
      setOrder: 1,
      roundOrder: 0,
      setType: 'normal',
      measurementType: 'weight_reps',
      weightKg: 80,
      reps: 8,
      repsMin: 6,
      repsMax: 10,
      durationSeconds: null,
    },
  ],
};

describe('<WorkoutLogExerciseCard />', () => {
  test('renders exercise name, variation, note and set values', () => {
    const { getByText } = render(<WorkoutLogExerciseCard exercise={exercise} />);

    getByText('Bench Press');
    getByText('Barbell');
    getByText('felt strong');
    getByText('40 kg × 12');
    getByText('80 kg × 8');
    getByText('6-10');
    getByText('W');
    getByText('N');
  });
});

describe('<WorkoutLogSupersetCard />', () => {
  test('renders a superset badge and labels members A and B', () => {
    const members: WorkoutLogDetailExercise[] = [
      { ...exercise, variationId: 'a', exerciseName: 'Bench Press' },
      { ...exercise, variationId: 'b', exerciseName: 'Row', variationName: null },
    ];

    const { getByText } = render(<WorkoutLogSupersetCard members={members} />);

    getByText('Supersérie');
    getByText('A');
    getByText('B');
    getByText('Bench Press');
    getByText('Row');
  });
});
