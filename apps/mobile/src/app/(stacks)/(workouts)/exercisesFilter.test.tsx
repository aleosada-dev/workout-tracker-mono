jest.mock('@/features/api/lib/config', () => {
  const { createApiConfigMock } = jest.requireActual('@/features/test-utils/api-config');
  return createApiConfigMock();
});

jest.mock('@/features/auth/lib', () => {
  const { createAuthMock } = jest.requireActual('@/features/test-utils/auth');
  return createAuthMock();
});

jest.mock('@/features/observability/lib', () => {
  const { createObservabilityMock } = jest.requireActual('@/features/test-utils/observability');
  return createObservabilityMock();
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    createAnimatedComponent: (c: unknown) => c,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    back: (...args: unknown[]) => mockBack(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

jest.mock('@/features/muscles/components/muscle-multi-select', () => ({
  MuscleMultiSelect: () => null,
}));

jest.mock('@/features/equipments/components/equipment-select', () => ({
  EquipmentSelect: () => null,
}));

import { fireEvent, render } from '@testing-library/react-native';
import ExercisesFilterScreen from '@/app/(stacks)/(workouts)/exercisesFilter';
import {
  EMPTY_EXERCISE_LIST_PARAMS,
  type ExerciseListParams,
} from '@/features/exercises/api/exercises';
import { exerciseFilters$ } from '@/features/exercises/state/exercise-list-filter-store';

beforeEach(() => {
  mockBack.mockClear();
  exerciseFilters$.set(EMPTY_EXERCISE_LIST_PARAMS);
});

describe('<ExercisesFilterScreen />', () => {
  test('Apply forwards the draft (with a type toggled off) to filters$', () => {
    exerciseFilters$.set({
      query: { visibility: 'all', exerciseTypes: ['musculacao', 'preparatorio'] },
    });
    const { getByTestId } = render(<ExercisesFilterScreen />);

    fireEvent.press(getByTestId('exercises-filter.type.musculacao'));
    fireEvent.press(getByTestId('exercises-filter.apply'));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(exerciseFilters$.get()).toEqual<ExerciseListParams>({
      query: { visibility: 'all', exerciseTypes: ['preparatorio'] },
    });
  });

  test('Apply preserves the visibility coming from the store', () => {
    exerciseFilters$.set({ query: { visibility: 'owned' } });
    const { getByTestId } = render(<ExercisesFilterScreen />);

    fireEvent.press(getByTestId('exercises-filter.apply'));

    expect(exerciseFilters$.get()).toEqual<ExerciseListParams>({
      query: { visibility: 'owned' },
    });
  });

  test('Clear applies an empty filter and closes the screen', () => {
    exerciseFilters$.set({ query: { visibility: 'owned', exerciseTypes: ['musculacao'] } });
    const { getByTestId } = render(<ExercisesFilterScreen />);

    fireEvent.press(getByTestId('exercises-filter.clear'));

    expect(exerciseFilters$.get()).toEqual<ExerciseListParams>(EMPTY_EXERCISE_LIST_PARAMS);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
