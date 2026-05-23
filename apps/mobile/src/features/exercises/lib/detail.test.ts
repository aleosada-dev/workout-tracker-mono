import type { TFunction } from 'i18next';
import type { ExerciseDetailResponse } from '@/features/exercises/api/exercises';
import { toExerciseDetailData } from '@/features/exercises/lib/detail';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  pt: {
    'muscles.back': 'Costas',
    'muscles.glutes': 'Glúteos',
    'muscles.quadriceps': 'Quadríceps',
    'equipment.machine': 'Máquina',
    'equipment.barbell': 'Barra',
    'exerciseNames.pullUp': 'Barra Fixa',
    'variationNames.wideGrip': 'Pegada Aberta',
  },
  en: {
    'muscles.back': 'Back',
    'muscles.glutes': 'Glutes',
    'muscles.quadriceps': 'Quadriceps',
    'equipment.machine': 'Machine',
    'equipment.barbell': 'Barbell',
    'exerciseNames.pullUp': 'Pull-up',
    'variationNames.wideGrip': 'Wide Grip',
  },
};

const makeT = (lng: string) =>
  ((key: string, opts?: { defaultValue?: string }) =>
    TRANSLATIONS[lng]?.[key] ?? opts?.defaultValue ?? key) as unknown as TFunction;

function makeResponse(overrides: Partial<ExerciseDetailResponse> = {}): ExerciseDetailResponse {
  const variation = {
    exerciseName: 'Barra Fixa',
    exerciseSlug: null,
    variationName: null,
    variationSlug: null,
    equipmentSlug: 'machine',
    equipmentPreposition: 'na',
    muscleSlug: 'back',
    secondaryMuscleSlug: null,
    youtubeUrl: null,
    videoUrl: null,
    userId: null,
    deletedAt: null,
    deletedBy: null,
    deletedByName: null,
  };
  const session = {
    workoutLogId: 'log-2',
    startedAt: '2026-04-03T17:39:11.741831+00:00',
    maxWeightKg: 20,
    totalVolumeKg: 360,
    maxReps: 10,
    totalSets: 3,
    sets: [
      { setOrder: 1, setType: 'normal' as const, weightKg: 20, reps: 9, repsMin: 6, repsMax: 10 },
      { setOrder: 0, setType: 'warmup' as const, weightKg: null, reps: 5, repsMin: 5, repsMax: 8 },
    ],
  };
  return {
    variationId: 'var-1',
    variation,
    sessions: [
      session,
      {
        workoutLogId: 'log-1',
        startedAt: '2026-03-29T17:39:11.741831+00:00',
        maxWeightKg: null,
        totalVolumeKg: 0,
        maxReps: 9,
        totalSets: 3,
        sets: [],
      },
    ],
    lastSession: session,
    records: { maxWeightKg: null, maxVolumeKg: 700, maxReps: 10, maxSets: 4 },
    ...overrides,
  };
}

describe('toExerciseDetailData', () => {
  test('pt: composes the variation name with the preposition', () => {
    expect(toExerciseDetailData(makeResponse(), 'pt', makeT('pt')).name).toBe(
      'Barra Fixa na Máquina',
    );
  });

  test('en: leads with the translated equipment', () => {
    expect(toExerciseDetailData(makeResponse(), 'en', makeT('en')).name).toBe('Machine Barra Fixa');
  });

  test('sorts sessions chronologically and skips null metric values', () => {
    const { metrics } = toExerciseDetailData(makeResponse(), 'pt', makeT('pt'));
    expect(metrics.volume.points).toEqual([
      { date: '2026-03-29T17:39:11.741831+00:00', value: 0 },
      { date: '2026-04-03T17:39:11.741831+00:00', value: 360 },
    ]);
    // the session with maxWeightKg === null drops out of the maxWeight series
    expect(metrics.maxWeight.points).toEqual([
      { date: '2026-04-03T17:39:11.741831+00:00', value: 20 },
    ]);
  });

  test('orders the last session sets by setOrder and maps types/weights', () => {
    const { lastSession } = toExerciseDetailData(makeResponse(), 'pt', makeT('pt'));
    expect(lastSession.date).toBe('2026-04-03T17:39:11.741831+00:00');
    expect(lastSession.sets).toEqual([
      { index: 1, type: 'warmup', weightKg: 0, reps: 5 },
      { index: 2, type: 'normal', weightKg: 20, reps: 9 },
    ]);
  });

  test('keeps only personal records with a value, in metric order', () => {
    expect(toExerciseDetailData(makeResponse(), 'pt', makeT('pt')).personalRecords).toEqual([
      { metric: 'volume', value: 700 },
      { metric: 'maxReps', value: 10 },
      { metric: 'sets', value: 4 },
    ]);
  });

  test('falls back to an empty last session when none is returned', () => {
    const data = toExerciseDetailData(makeResponse({ lastSession: null }), 'pt', makeT('pt'));
    expect(data.lastSession).toEqual({ date: '', sets: [] });
  });

  test('passes the uploaded video URL through from the detail endpoint', () => {
    expect(toExerciseDetailData(makeResponse(), 'pt', makeT('pt')).videoUrl).toBeNull();

    const withVideo = toExerciseDetailData(
      makeResponse({
        variation: {
          exerciseName: 'Barra Fixa',
          exerciseSlug: null,
          variationName: null,
          variationSlug: null,
          equipmentSlug: 'machine',
          equipmentPreposition: 'na',
          muscleSlug: 'back',
          secondaryMuscleSlug: null,
          youtubeUrl: null,
          videoUrl: 'https://cdn.example.com/clip.mp4',
          userId: null,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
        },
      }),
      'pt',
      makeT('pt'),
    );
    expect(withVideo.videoUrl).toBe('https://cdn.example.com/clip.mp4');
  });

  test('translates muscle slugs to the current language', () => {
    const pt = toExerciseDetailData(makeResponse(), 'pt', makeT('pt'));
    expect(pt.primaryMuscle).toBe('Costas');
    expect(pt.secondaryMuscle).toBeNull();

    const en = toExerciseDetailData(makeResponse(), 'en', makeT('en'));
    expect(en.primaryMuscle).toBe('Back');
  });

  test('translates the exercise and variation names from their slugs', () => {
    const data = toExerciseDetailData(
      makeResponse({
        variation: {
          exerciseName: 'Barra Fixa',
          exerciseSlug: 'pullUp',
          variationName: 'Pegada Aberta',
          variationSlug: 'wideGrip',
          equipmentSlug: 'machine',
          equipmentPreposition: 'na',
          muscleSlug: 'back',
          secondaryMuscleSlug: null,
          youtubeUrl: null,
          videoUrl: null,
          userId: null,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
        },
      }),
      'en',
      makeT('en'),
    );
    expect(data.name).toBe('Machine Pull-up');
    expect(data.variationName).toBe('Wide Grip');
  });

  test('falls back to the stored names when the slugs have no translation', () => {
    const data = toExerciseDetailData(
      makeResponse({
        variation: {
          exerciseName: 'Barra Fixa',
          exerciseSlug: 'unknownExercise',
          variationName: 'Pegada Fechada',
          variationSlug: 'unknownVariation',
          equipmentSlug: 'machine',
          equipmentPreposition: 'na',
          muscleSlug: 'back',
          secondaryMuscleSlug: null,
          youtubeUrl: null,
          videoUrl: null,
          userId: null,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
        },
      }),
      'pt',
      makeT('pt'),
    );
    expect(data.name).toBe('Barra Fixa na Máquina');
    expect(data.variationName).toBe('Pegada Fechada');
  });

  test('maps the secondary muscle when present', () => {
    const data = toExerciseDetailData(
      makeResponse({
        variation: {
          exerciseName: 'Agachamento',
          exerciseSlug: null,
          variationName: null,
          variationSlug: null,
          equipmentSlug: 'barbell',
          equipmentPreposition: 'com',
          muscleSlug: 'quadriceps',
          secondaryMuscleSlug: 'glutes',
          youtubeUrl: null,
          videoUrl: null,
          userId: null,
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
        },
      }),
      'pt',
      makeT('pt'),
    );
    expect(data.primaryMuscle).toBe('Quadríceps');
    expect(data.secondaryMuscle).toBe('Glúteos');
  });
});
