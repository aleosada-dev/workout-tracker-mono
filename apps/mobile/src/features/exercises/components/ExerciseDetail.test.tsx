import { fireEvent, render } from '@testing-library/react-native';
import { ExerciseDetail } from '@/features/exercises/components/ExerciseDetail';
import { getMockExerciseDetail } from '@/features/exercises/lib/detail-mock';
import type { ExerciseDetailData } from '@/features/exercises/lib/detail-types';

// The chart and demo-video pull in Skia / expo-video / WebView native modules;
// stub them out so this test focuses on ExerciseDetail's own composition and state.
jest.mock('@/features/exercises/components/ExerciseMetricChart', () => ({
  ExerciseMetricChart: () => null,
}));
jest.mock('@/features/exercises/components/ExerciseDemoVideo', () => ({
  ExerciseDemoVideo: () => null,
}));
jest.mock('@/features/workouts/components/SetTypesHelpDialog', () => {
  const { View } = require('react-native');
  return {
    SetTypesHelpDialog: () => <View testID="exercise-detail.sets.types.help-trigger" />,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { date?: string }) => (opts?.date ? `${key}|${opts.date}` : key),
    i18n: { language: 'pt' },
  }),
}));

describe('<ExerciseDetail />', () => {
  const data = getMockExerciseDetail('ex-1', 'Abdução de Quadril no Cabo', 'c/ banco inclinado');

  test('renders the primary and auxiliary muscles', () => {
    const { getByTestId, getByText } = render(<ExerciseDetail data={data} />);

    getByTestId('exercise-detail.muscle.primary');
    getByTestId('exercise-detail.muscle.secondary');
    getByText('Glúteos');
    getByText('Abdutores');
  });

  test('omits the auxiliary muscle when not provided', () => {
    const { getByTestId, queryByTestId } = render(
      <ExerciseDetail data={{ ...data, secondaryMuscle: null }} />,
    );

    getByTestId('exercise-detail.muscle.primary');
    expect(queryByTestId('exercise-detail.muscle.secondary')).toBeNull();
  });

  test('renders one chip per metric', () => {
    const { getByTestId } = render(<ExerciseDetail data={data} />);

    getByTestId('exercise-detail.metric.maxWeight');
    getByTestId('exercise-detail.metric.volume');
    getByTestId('exercise-detail.metric.maxReps');
    getByTestId('exercise-detail.metric.sets');
  });

  test('renders the last-session and personal-records sections', () => {
    const { getByText, getAllByText } = render(<ExerciseDetail data={data} />);

    // title carries the interpolated session date
    expect(getByText(/^exerciseDetailScreen\.sets\.title\|/)).toBeTruthy();
    getByText('exerciseDetailScreen.personalRecords.title');
    // three logged sets, all weighted 7,5 kg
    expect(getAllByText('7,5 kg')).toHaveLength(3);
  });

  test('renders the set-types help trigger next to the Tipo header', () => {
    const { getByTestId } = render(<ExerciseDetail data={data} />);

    getByTestId('exercise-detail.sets.types.help-trigger');
  });

  test('renders empty states when there is no data', () => {
    const emptyData: ExerciseDetailData = {
      id: 'ex-empty',
      variationUserId: null,
      isDeleted: false,
      deletedAt: null,
      deletedByName: null,
      name: 'New Exercise',
      variationName: null,
      equipmentName: 'Máquina',
      primaryMuscle: 'Costas',
      secondaryMuscle: null,
      measurementType: 'weight_reps',
      videoUrl: null,
      youtubeUrl: null,
      metrics: {
        maxWeight: { unit: 'kg', points: [] },
        volume: { unit: 'kg', points: [] },
        maxReps: { unit: 'reps', points: [] },
        sets: { unit: 'count', points: [] },
      },
      lastSession: { date: '', sets: [] },
      personalRecords: [],
    };

    const { getByTestId, getByText, queryByText } = render(<ExerciseDetail data={emptyData} />);

    getByTestId('exercise-detail.chart.empty');
    getByTestId('exercise-detail.sets.empty');
    getByTestId('exercise-detail.records.empty');
    // last-session heading falls back to the date-less title
    getByText('exerciseDetailScreen.sets.titleEmpty');
    expect(queryByText(/^exerciseDetailScreen\.sets\.title\|/)).toBeNull();
  });

  const unloadedData: ExerciseDetailData = {
    id: 'ex-bw',
    variationUserId: null,
    isDeleted: false,
    deletedAt: null,
    deletedByName: null,
    name: 'Barra Fixa',
    variationName: null,
    equipmentName: 'Barra',
    primaryMuscle: 'Costas',
    secondaryMuscle: null,
    measurementType: 'weight_reps',
    videoUrl: null,
    youtubeUrl: null,
    metrics: {
      maxWeight: { unit: 'kg', points: [] },
      volume: {
        unit: 'kg',
        points: [
          { date: '2026-04-02', value: 0 },
          { date: '2026-04-06', value: 0 },
        ],
      },
      maxReps: {
        unit: 'reps',
        points: [
          { date: '2026-04-02', value: 8 },
          { date: '2026-04-06', value: 9 },
        ],
      },
      sets: {
        unit: 'count',
        points: [
          { date: '2026-04-02', value: 3 },
          { date: '2026-04-06', value: 3 },
        ],
      },
    },
    lastSession: {
      date: '2026-04-06',
      sets: [
        {
          index: 1,
          type: 'normal',
          weightKg: 0,
          reps: 9,
          durationSeconds: null,
          distanceMeters: null,
        },
        {
          index: 2,
          type: 'normal',
          weightKg: 0,
          reps: 8,
          durationSeconds: null,
          distanceMeters: null,
        },
        {
          index: 3,
          type: 'normal',
          weightKg: 0,
          reps: 7,
          durationSeconds: null,
          distanceMeters: null,
        },
      ],
    },
    personalRecords: [
      { metric: 'maxReps', value: 9 },
      { metric: 'sets', value: 3 },
    ],
  };

  test('shows the unloaded empty state for maxWeight on a bodyweight exercise', () => {
    const { getByTestId, queryByTestId } = render(<ExerciseDetail data={unloadedData} />);

    getByTestId('exercise-detail.chart.empty-unloaded');
    expect(queryByTestId('exercise-detail.chart.empty')).toBeNull();
  });

  test('shows the unloaded empty state for volume on a bodyweight exercise', () => {
    const { getByTestId, queryByTestId } = render(<ExerciseDetail data={unloadedData} />);

    fireEvent.press(getByTestId('exercise-detail.metric.volume'));

    getByTestId('exercise-detail.chart.empty-unloaded');
    expect(queryByTestId('exercise-detail.chart.empty')).toBeNull();
  });

  test('renders the chart for maxReps on a bodyweight exercise', () => {
    const { getByTestId, queryByTestId } = render(<ExerciseDetail data={unloadedData} />);

    fireEvent.press(getByTestId('exercise-detail.metric.maxReps'));

    expect(queryByTestId('exercise-detail.chart.empty-unloaded')).toBeNull();
    expect(queryByTestId('exercise-detail.chart.empty')).toBeNull();
  });

  test('highlights the personal record matching the selected metric', () => {
    const { getByTestId } = render(<ExerciseDetail data={data} />);

    expect(getByTestId('exercise-detail.record.maxWeight').props.accessibilityHint).toBeTruthy();
    expect(getByTestId('exercise-detail.record.volume').props.accessibilityHint).toBeUndefined();

    fireEvent.press(getByTestId('exercise-detail.metric.volume'));

    expect(getByTestId('exercise-detail.record.volume').props.accessibilityHint).toBeTruthy();
    expect(getByTestId('exercise-detail.record.maxWeight').props.accessibilityHint).toBeUndefined();
  });
});
