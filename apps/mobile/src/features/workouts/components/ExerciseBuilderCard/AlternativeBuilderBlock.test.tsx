jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const fade = { duration: () => fade, delay: () => fade };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    FadeIn: fade,
    FadeOut: fade,
    View,
    createAnimatedComponent: (c: unknown) => c,
  };
});
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `uuid-${n++}` };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/preferences/hooks/use-user-preferences', () => ({
  useUserPreferences: () => ({ data: { autoFillReps: true } }),
}));

import { expect, test } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { FormProvider, useForm } from 'react-hook-form';
import type { WorkoutFormInput } from '@/features/workouts/lib/builder-form';
import { AlternativeBuilderBlock } from './AlternativeBuilderBlock';

function Wrapper() {
  const form = useForm<WorkoutFormInput>({
    defaultValues: {
      name: 'W',
      description: '',
      exercises: [
        {
          id: 'p1',
          exerciseType: 'strength',
          position: 0,
          supersetGroupId: 'p1',
          supersetOrder: 0,
          note: null,
          restSeconds: null,
          variation: {
            id: 'vp',
            slug: null,
            name: null,
            exercise: { slug: null, name: 'Agachamento', type: 'musculacao' },
            measurementType: 'weight_reps',
            equipment: { slug: 'barbell', preposition: 'com' },
            muscle: { slug: 'quads' },
            secondaryMuscle: null,
          },
          sets: [
            {
              id: 'ps',
              type: 'normal',
              measurementType: 'weight_reps',
              roundOrder: 0,
              repsMin: '8',
              repsMax: '10',
              duration: '',
              distance: '',
              loadPercent: '',
              linkedSetId: null,
            },
          ],
          alternative: {
            id: 'a1',
            note: null,
            restSeconds: null,
            variation: {
              id: 'va',
              slug: null,
              name: 'Variação Alt',
              exercise: { slug: null, name: 'Leg Press', type: 'musculacao' },
              measurementType: 'weight_reps',
              equipment: { slug: 'machine', preposition: 'na' },
              muscle: { slug: 'quads' },
              secondaryMuscle: null,
            },
            sets: [
              {
                id: 'as',
                type: 'normal',
                measurementType: 'weight_reps',
                roundOrder: 0,
                repsMin: '8',
                repsMax: '10',
                duration: '',
                distance: '',
                loadPercent: '',
                linkedSetId: null,
              },
            ],
          },
        },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <AlternativeBuilderBlock exerciseIndex={0} onSwap={() => {}} onRemove={() => {}} />
    </FormProvider>
  );
}

test('renders the alternative label and its set row', () => {
  render(<Wrapper />);
  expect(screen.getByText('workoutFormScreen.alternative.label')).toBeTruthy();
  expect(screen.getByText('Variação Alt')).toBeTruthy();
  expect(screen.getByTestId('workout-form.alternative-0.set-0.type')).toBeTruthy();
});
