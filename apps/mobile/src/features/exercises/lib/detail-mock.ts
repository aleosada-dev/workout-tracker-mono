import type { MetricChartPoint } from '@/features/charts/lib/types';
import type { ExerciseDetailData } from './detail-types';

/** Public sample video — used so the "has video" path is exercised in the UI. */
const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

/** Builds a flat-ish series of {@link MetricChartPoint}s across the given dates. */
function series(dates: string[], values: number[]): MetricChartPoint[] {
  return dates.map((date, i) => ({ date, value: values[i] ?? values[values.length - 1] ?? 0 }));
}

const SESSION_DATES = [
  '2026-04-02',
  '2026-04-06',
  '2026-04-09',
  '2026-04-13',
  '2026-04-16',
  '2026-04-20',
  '2026-04-23',
];

/**
 * Returns mocked detail data for an exercise. `name` / `variationName` let the
 * screen reflect the exercise actually tapped in the list; both fall back to a
 * representative default when missing.
 */
export function getMockExerciseDetail(
  id: string,
  name?: string,
  variationName?: string | null,
): ExerciseDetailData {
  return {
    id,
    variationUserId: null,
    isDeleted: false,
    deletedAt: null,
    deletedByName: null,
    name: name?.trim() || 'Abdução de Quadril no Cabo',
    variationName: variationName ?? 'c/ banco inclinado',
    equipmentName: 'Cabo',
    primaryMuscle: 'Glúteos',
    secondaryMuscle: 'Abdutores',
    videoUrl: SAMPLE_VIDEO_URL,
    youtubeUrl: null,
    metrics: {
      maxWeight: {
        unit: 'kg',
        points: series(SESSION_DATES, [8, 8, 8, 8, 8, 8, 8]),
      },
      volume: {
        unit: 'kg',
        points: series(SESSION_DATES, [216, 225, 234, 240, 252, 261, 270]),
      },
      maxReps: {
        unit: 'reps',
        points: series(SESSION_DATES, [10, 10, 11, 11, 12, 12, 12]),
      },
      sets: {
        unit: 'count',
        points: series(SESSION_DATES, [3, 3, 3, 3, 3, 3, 3]),
      },
    },
    lastSession: {
      date: '2026-04-23',
      sets: [
        { index: 1, type: 'normal', weightKg: 7.5, reps: 12 },
        { index: 2, type: 'normal', weightKg: 7.5, reps: 12 },
        { index: 3, type: 'normal', weightKg: 7.5, reps: 12 },
      ],
    },
    personalRecords: [
      { metric: 'maxWeight', value: 7.5 },
      { metric: 'volume', value: 270 },
      { metric: 'maxReps', value: 12 },
      { metric: 'sets', value: 3 },
    ],
  };
}
