import type { ListMusclesResponse } from '@/features/muscles/api/muscles';
import {
  buildMuscleSetVolumes,
  type MuscleVolumeExercise,
} from '@/features/muscles/lib/build-muscle-set-volumes';

type FixtureMuscle = {
  slug: string;
  level: number;
  children?: FixtureMuscle[];
};

// Hierarquia mínima de 3 níveis. Os campos restantes do tipo da resposta não são
// lidos pelo builder, então castamos a fixture para o tipo da API.
const MUSCLES = [
  {
    slug: 'upper-body',
    level: 1,
    children: [
      {
        slug: 'chest',
        level: 2,
        children: [
          { slug: 'upper-chest', level: 3 },
          { slug: 'lower-chest', level: 3 },
        ],
      },
      { slug: 'back', level: 2, children: [{ slug: 'lats', level: 3 }] },
    ],
  },
  {
    slug: 'arms',
    level: 1,
    children: [
      { slug: 'triceps', level: 2 },
      { slug: 'biceps', level: 2 },
    ],
  },
] satisfies FixtureMuscle[] as unknown as ListMusclesResponse;

function volumeFor(slug: string, result: ReturnType<typeof buildMuscleSetVolumes>) {
  return result.find((entry) => entry.slug === slug)?.sets ?? 0;
}

function run(exercises: MuscleVolumeExercise[]) {
  return buildMuscleSetVolumes(exercises, MUSCLES);
}

test('propaga uma série de músculo L3 para os ancestrais L2 e L1', () => {
  const result = run([{ primarySlug: 'upper-chest', secondarySlug: null, setCount: 3 }]);

  expect(volumeFor('upper-chest', result)).toBe(3);
  expect(volumeFor('chest', result)).toBe(3);
  expect(volumeFor('upper-body', result)).toBe(3);
});

test('músculo primário L2 não gera entrada L3', () => {
  const result = run([{ primarySlug: 'back', secondarySlug: null, setCount: 2 }]);

  expect(volumeFor('back', result)).toBe(2);
  expect(volumeFor('upper-body', result)).toBe(2);
  expect(result.some((entry) => entry.level === 3)).toBe(false);
});

test('secundário com mesmo ancestral L2 não é contado em dobro', () => {
  const result = run([{ primarySlug: 'upper-chest', secondarySlug: 'lower-chest', setCount: 3 }]);

  expect(volumeFor('lower-chest', result)).toBe(0);
  expect(volumeFor('upper-chest', result)).toBe(3);
  expect(volumeFor('chest', result)).toBe(3);
});

test('secundário com ancestral L2 diferente é contado e propagado', () => {
  const result = run([{ primarySlug: 'chest', secondarySlug: 'triceps', setCount: 4 }]);

  expect(volumeFor('chest', result)).toBe(4);
  expect(volumeFor('upper-body', result)).toBe(4);
  expect(volumeFor('triceps', result)).toBe(4);
  expect(volumeFor('arms', result)).toBe(4);
});

test('slug desconhecido é ignorado', () => {
  const result = run([{ primarySlug: 'ghost-muscle', secondarySlug: null, setCount: 5 }]);

  expect(result).toHaveLength(0);
});

test('exercícios acumulam entre si', () => {
  const result = run([
    { primarySlug: 'upper-chest', secondarySlug: null, setCount: 2 },
    { primarySlug: 'lower-chest', secondarySlug: null, setCount: 1 },
  ]);

  expect(volumeFor('upper-chest', result)).toBe(2);
  expect(volumeFor('lower-chest', result)).toBe(1);
  expect(volumeFor('chest', result)).toBe(3);
  expect(volumeFor('upper-body', result)).toBe(3);
});

test('séries zeradas não geram entradas', () => {
  const result = run([{ primarySlug: 'upper-chest', secondarySlug: null, setCount: 0 }]);

  expect(result).toHaveLength(0);
});
