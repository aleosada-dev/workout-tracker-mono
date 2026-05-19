import type { TFunction } from 'i18next';
import type {
  ListExercisesResponseExercise,
  ListExercisesResponseVariation,
} from '@/exercises/api/exercises';
import { composeExerciseName, toExercise } from '@/exercises/lib/format';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  pt: {
    'muscles.reto-abdominal': 'Reto Abdominal',
    'equipment.maquina': 'Máquina',
  },
  en: {
    'muscles.reto-abdominal': 'Rectus Abdominis',
    'equipment.maquina': 'Machine',
  },
};

const makeT = (lng: string) =>
  ((key: string) => TRANSLATIONS[lng]?.[key] ?? key) as unknown as TFunction;

function makeExercise(
  overrides: Partial<ListExercisesResponseExercise> = {},
): ListExercisesResponseExercise {
  return {
    id: 'ex-1',
    name: 'Abdominal',
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
    muscle: {
      id: 'm1',
      name: 'Reto Abdominal',
      slug: 'reto-abdominal',
      level2: { name: 'Abdômen', slug: 'abdomen' },
    },
    secondaryMuscle: null,
    equipment: { id: 'eq1', name: 'Máquina', slug: 'maquina', preposition: 'na' },
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
          { exerciseName: 'Abdominal', equipmentName: 'Máquina', equipmentPreposition: 'na' },
          'pt',
        ),
      ).toBe('Abdominal na Máquina');
    });
  });

  describe('en', () => {
    test('leads with the equipment, no preposition', () => {
      expect(
        composeExerciseName(
          { exerciseName: 'Abdominal', equipmentName: 'Machine', equipmentPreposition: 'na' },
          'en',
        ),
      ).toBe('Machine Abdominal');
    });

    test('passes the equipment name through unchanged', () => {
      expect(
        composeExerciseName(
          { exerciseName: 'Abdominal', equipmentName: 'Unknown', equipmentPreposition: 'na' },
          'en',
        ),
      ).toBe('Unknown Abdominal');
    });
  });
});

describe('toExercise', () => {
  test('pt: maps an API exercise + variation to the UI shape', () => {
    expect(toExercise(makeExercise(), makeVariation(), 'pt', makeT('pt'))).toEqual({
      id: 'id-1',
      name: 'Abdominal na Máquina',
      variationName: null,
      primaryMuscle: 'Reto Abdominal',
      type: 'musculacao',
      visibility: 'public',
    });
  });

  test('en: translates the primary muscle and reorders the display name', () => {
    expect(toExercise(makeExercise(), makeVariation(), 'en', makeT('en'))).toEqual({
      id: 'id-1',
      name: 'Machine Abdominal',
      variationName: null,
      primaryMuscle: 'Rectus Abdominis',
      type: 'musculacao',
      visibility: 'public',
    });
  });

  test('marks items that have a userId as private', () => {
    expect(
      toExercise(makeExercise({ userId: 'user-123' }), makeVariation(), 'pt', makeT('pt'))
        .visibility,
    ).toBe('private');
  });

  test('keeps the exercise type as a slug for the UI to translate', () => {
    expect(
      toExercise(makeExercise({ type: 'preparatorio' }), makeVariation(), 'pt', makeT('pt')).type,
    ).toBe('preparatorio');
  });
});
