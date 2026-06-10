import type { TFunction } from 'i18next';
import type {
  ListExercisesResponseExercise,
  ListExercisesResponseVariation,
} from '@/features/exercises/api/exercises';
import {
  composeExerciseName,
  formatDistanceMeters,
  formatMetricValue,
  toExercise,
} from '@/features/exercises/lib/format';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  pt: {
    'muscles.reto-abdominal': 'Reto Abdominal',
    'equipment.maquina': 'Máquina',
    'exerciseNames.benchPress': 'Supino',
    'variationNames.inclineBench': 'Inclinado',
  },
  en: {
    'muscles.reto-abdominal': 'Rectus Abdominis',
    'equipment.maquina': 'Machine',
    'exerciseNames.benchPress': 'Bench Press',
    'variationNames.inclineBench': 'Incline Bench',
  },
};

const makeT = (lng: string) =>
  ((key: string, opts?: { defaultValue?: string }) =>
    TRANSLATIONS[lng]?.[key] ?? opts?.defaultValue ?? key) as unknown as TFunction;

function makeExercise(
  overrides: Partial<ListExercisesResponseExercise> = {},
): ListExercisesResponseExercise {
  return {
    id: 'ex-1',
    name: 'Abdominal',
    slug: null,
    type: 'musculacao',
    userId: null,
    variations: [],
    ...overrides,
  };
}

function makeVariation(
  overrides: Partial<ListExercisesResponseVariation> = {},
): ListExercisesResponseVariation {
  return {
    id: 'id-1',
    name: null,
    slug: null,
    muscle: {
      id: 'm1',
      name: 'Reto Abdominal',
      slug: 'reto-abdominal',
      level2: { name: 'Abdômen', slug: 'abdomen' },
    },
    secondaryMuscle: null,
    equipment: { id: 'eq1', name: 'Máquina', slug: 'maquina', preposition: 'na' },
    measurementType: 'weight_reps',
    video: null,
    imageUrl: null,
    ...overrides,
  };
}

describe('composeExerciseName', () => {
  describe('pt', () => {
    test('joins exercise name, preposition and equipment', () => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Abdominal',
            equipmentName: 'Máquina',
            equipmentPreposition: 'na',
            equipmentSlug: 'machine',
          },
          'pt',
        ),
      ).toBe('Abdominal na Máquina');
    });
  });

  describe('en', () => {
    test('leads with the equipment, no preposition', () => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Abdominal',
            equipmentName: 'Machine',
            equipmentPreposition: 'na',
            equipmentSlug: 'machine',
          },
          'en',
        ),
      ).toBe('Machine Abdominal');
    });

    test('passes the equipment name through unchanged', () => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Abdominal',
            equipmentName: 'Unknown',
            equipmentPreposition: 'na',
            equipmentSlug: 'unknown',
          },
          'en',
        ),
      ).toBe('Unknown Abdominal');
    });
  });

  describe('name-only equipment', () => {
    test('pt: bodyweight uses just the exercise name', () => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Flexão',
            equipmentName: 'Peso Corporal',
            equipmentPreposition: 'com',
            equipmentSlug: 'bodyweight',
          },
          'pt',
        ),
      ).toBe('Flexão');
    });

    test('en: other uses just the exercise name', () => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Plank',
            equipmentName: 'Other',
            equipmentPreposition: 'with',
            equipmentSlug: 'other',
          },
          'en',
        ),
      ).toBe('Plank');
    });

    test.each([
      'treadmill',
      'stationaryBike',
      'rowingMachine',
      'elliptical',
      'stairClimber',
    ])('pt: cardio equipment %s uses just the exercise name', (equipmentSlug) => {
      expect(
        composeExerciseName(
          {
            exerciseName: 'Corrida',
            equipmentName: 'Esteira',
            equipmentPreposition: 'na',
            equipmentSlug,
          },
          'pt',
        ),
      ).toBe('Corrida');
    });
  });
});

describe('formatDistanceMeters', () => {
  test('shows meters below 1km', () => {
    expect(formatDistanceMeters(800, 'en')).toBe('800 m');
  });

  test('shows km at or above 1km', () => {
    expect(formatDistanceMeters(5000, 'en')).toBe('5 km');
    expect(formatDistanceMeters(5250, 'en')).toBe('5.25 km');
  });
});

describe('formatMetricValue', () => {
  test('formats duration metrics as mm:ss', () => {
    expect(formatMetricValue('maxDuration', 90, 'en')).toBe('01:30');
  });

  test('formats distance metrics in m/km', () => {
    expect(formatMetricValue('maxDistance', 5000, 'en')).toBe('5 km');
  });

  test('formats weight metrics in kg with two decimals', () => {
    expect(formatMetricValue('maxWeight', 7.5, 'en')).toBe('7.50 kg');
  });

  test('formats rep and count metrics as integers', () => {
    expect(formatMetricValue('maxReps', 12, 'en')).toBe('12');
    expect(formatMetricValue('sets', 3, 'en')).toBe('3');
  });
});

describe('toExercise', () => {
  const CURRENT_USER_ID = 'current-user';

  test('pt: maps an API exercise + variation to the UI shape', () => {
    expect(toExercise(makeExercise(), makeVariation(), 'pt', makeT('pt'), CURRENT_USER_ID)).toEqual(
      {
        id: 'id-1',
        name: 'Abdominal na Máquina',
        variationName: null,
        primaryMuscle: 'Reto Abdominal',
        type: 'musculacao',
        measurementType: 'weight_reps',
        visibility: 'public',
        userId: null,
      },
    );
  });

  test('en: translates the primary muscle and reorders the display name', () => {
    expect(toExercise(makeExercise(), makeVariation(), 'en', makeT('en'), CURRENT_USER_ID)).toEqual(
      {
        id: 'id-1',
        name: 'Machine Abdominal',
        variationName: null,
        primaryMuscle: 'Rectus Abdominis',
        type: 'musculacao',
        measurementType: 'weight_reps',
        visibility: 'public',
        userId: null,
      },
    );
  });

  test('marks items owned by the current user as owned', () => {
    expect(
      toExercise(
        makeExercise({ userId: CURRENT_USER_ID }),
        makeVariation(),
        'pt',
        makeT('pt'),
        CURRENT_USER_ID,
      ).visibility,
    ).toBe('owned');
  });

  test('marks items owned by another user as shared', () => {
    expect(
      toExercise(
        makeExercise({ userId: 'other-user' }),
        makeVariation(),
        'pt',
        makeT('pt'),
        CURRENT_USER_ID,
      ).visibility,
    ).toBe('shared');
  });

  test('keeps the exercise type as a slug for the UI to translate', () => {
    expect(
      toExercise(
        makeExercise({ type: 'preparatorio' }),
        makeVariation(),
        'pt',
        makeT('pt'),
        CURRENT_USER_ID,
      ).type,
    ).toBe('preparatorio');
  });

  test('translates the exercise name from its slug', () => {
    expect(
      toExercise(
        makeExercise({ slug: 'benchPress' }),
        makeVariation(),
        'pt',
        makeT('pt'),
        CURRENT_USER_ID,
      ).name,
    ).toBe('Supino na Máquina');
  });

  test('pt: bodyweight equipment leaves the display name uncomposed', () => {
    expect(
      toExercise(
        makeExercise({ slug: 'benchPress' }),
        makeVariation({
          equipment: { id: 'eq2', name: 'Peso Corporal', slug: 'bodyweight', preposition: 'com' },
        }),
        'pt',
        makeT('pt'),
        CURRENT_USER_ID,
      ).name,
    ).toBe('Supino');
  });

  test('translates the variation name from its slug', () => {
    expect(
      toExercise(
        makeExercise(),
        makeVariation({ slug: 'inclineBench' }),
        'en',
        makeT('en'),
        CURRENT_USER_ID,
      ).variationName,
    ).toBe('Incline Bench');
  });

  test('falls back to the stored name when the slug has no translation', () => {
    const item = toExercise(
      makeExercise({ slug: 'unknownExercise' }),
      makeVariation({ slug: 'unknownVariation', name: 'Pegada Fechada' }),
      'pt',
      makeT('pt'),
      CURRENT_USER_ID,
    );
    expect(item.name).toBe('Abdominal na Máquina');
    expect(item.variationName).toBe('Pegada Fechada');
  });
});
