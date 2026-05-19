jest.mock('@/features/workout-logs/hooks/use-workout-log-summaries', () => ({
  useWorkoutLogSummaries: jest.fn(),
  PAGE_SIZE: 10,
}));

jest.mock('react-native-toast-message', () => {
  const { createToastMock } = jest.requireActual(
    '@/features/test-utils/react-native-toast-message',
  );
  return createToastMock();
});

jest.mock('@/features/observability/lib', () => {
  const { createObservabilityMock } = jest.requireActual('@/features/test-utils/observability');
  return createObservabilityMock();
});

jest.mock('@shopify/flash-list', () => {
  const { createFlashListMock } = jest.requireActual('@/features/test-utils/shopify-flash-list');
  return createFlashListMock();
});

jest.mock('react-i18next', () => {
  const { createI18nMock } = jest.requireActual('@/features/test-utils/react-i18next');
  return createI18nMock({
    'workoutLogs.emptyTitle': 'Nenhum treino registrado ainda.',
    'workoutLogs.emptySubtitle': 'Comece registrando seu primeiro treino.',
    'workoutLogs.error.title': 'Não foi possível carregar seus treinos.',
    'workoutLogs.error.retry': 'Tentar novamente',
    'workoutLogs.error.loadMore': 'Não foi possível carregar mais treinos.',
  });
});

import { fireEvent, render } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { ApiError, ApiUnauthorizedError } from '@/features/api/lib/errors';
import { observability } from '@/features/observability/lib';
import { WorkoutLogList } from '@/features/workout-logs/components/WorkoutLogList';
import { useWorkoutLogSummaries } from '@/features/workout-logs/hooks/use-workout-log-summaries';

const mockUseHook = useWorkoutLogSummaries as jest.Mock;
const mockToastShow = Toast.show as jest.Mock;
const mockCaptureException = observability.captureException as jest.Mock;

const baseHookReturn = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isFetchingNextPage: false,
  isRefetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
};

const item = (id: string, startedAt: string) => ({
  id,
  title: `Treino ${id}`,
  startedAt,
  durationSeconds: 3600,
  exerciseCount: 5,
  muscleGroupSlugs: ['chest'],
  prCount: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseHook.mockReturnValue(baseHookReturn);
});

describe('<WorkoutLogList />', () => {
  test('renders skeletons during initial load', () => {
    mockUseHook.mockReturnValue({ ...baseHookReturn, isLoading: true });

    const { getAllByTestId } = render(<WorkoutLogList />);

    expect(getAllByTestId('workout-log-card-skeleton').length).toBeGreaterThanOrEqual(3);
  });

  test('shows initial error state with retry button', () => {
    const refetch = jest.fn();
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
      data: undefined,
      refetch,
    });

    const { getByText } = render(<WorkoutLogList />);

    fireEvent.press(getByText('Tentar novamente'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  test('shows empty state when there are no items', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      data: { pages: [{ items: [], hasMore: false }], pageParams: [undefined] },
    });

    const { getByText } = render(<WorkoutLogList />);

    getByText('Nenhum treino registrado ainda.');
  });

  test('renders one card per summary across pages', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      data: {
        pages: [
          {
            items: [item('a', '2026-05-08T12:00:00Z'), item('b', '2026-05-07T12:00:00Z')],
            hasMore: true,
          },
          { items: [item('c', '2026-05-06T12:00:00Z')], hasMore: false },
        ],
        pageParams: [undefined, '2026-05-07T12:00:00Z'],
      },
    });

    const { getByText } = render(<WorkoutLogList />);

    getByText('Treino a');
    getByText('Treino b');
    getByText('Treino c');
  });

  test('captures workout error on isError (non-401)', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
    });

    render(<WorkoutLogList />);

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(ApiError),
      expect.objectContaining({
        tags: expect.objectContaining({ feature: 'workout-log', action: 'load_summaries' }),
      }),
    );
  });

  test('does NOT capture when error is ApiUnauthorizedError', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiUnauthorizedError(),
    });

    render(<WorkoutLogList />);

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  test('shows toast when paginated error occurs (already had pages)', () => {
    mockUseHook.mockReturnValue({
      ...baseHookReturn,
      isError: true,
      error: new ApiError(500, 'boom'),
      data: {
        pages: [{ items: [item('a', '2026-05-08T12:00:00Z')], hasMore: true }],
        pageParams: [undefined],
      },
    });

    render(<WorkoutLogList />);

    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text2: 'Não foi possível carregar mais treinos.',
      }),
    );
  });
});
