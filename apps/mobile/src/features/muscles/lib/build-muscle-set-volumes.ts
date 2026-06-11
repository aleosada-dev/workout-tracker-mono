import type { ListMuscleResponseItem, ListMusclesResponse } from '@/features/muscles/api/muscles';

export type MuscleVolumeExercise = {
  primarySlug: string;
  secondarySlug: string | null;
  setCount: number;
};

export type MuscleSetVolume = {
  slug: string;
  level: number;
  sets: number;
};

type NestedMuscle = ListMuscleResponseItem & { children?: NestedMuscle[] };

type MuscleInfo = {
  level: number;
  l1: string;
  l2: string | null;
};

function buildIndex(muscles: ListMusclesResponse): Map<string, MuscleInfo> {
  const index = new Map<string, MuscleInfo>();
  for (const l1 of muscles as NestedMuscle[]) {
    if (l1.level !== 1) continue;
    index.set(l1.slug, { level: 1, l1: l1.slug, l2: null });
    for (const l2 of l1.children ?? []) {
      index.set(l2.slug, { level: 2, l1: l1.slug, l2: l2.slug });
      for (const l3 of l2.children ?? []) {
        index.set(l3.slug, { level: 3, l1: l1.slug, l2: l2.slug });
      }
    }
  }
  return index;
}

/**
 * Conta séries por músculo e propaga para cima na hierarquia (L3 → L2 → L1), de
 * modo que cada nível some independentemente. O músculo secundário só conta
 * quando seu ancestral L2 difere do primário — evita dupla contagem dentro do
 * mesmo grupo. Slugs ausentes da hierarquia são ignorados. Porta de
 * `buildMuscleVolumes` do PWA legado, mas indexada por slug e contando séries.
 */
export function buildMuscleSetVolumes(
  exercises: MuscleVolumeExercise[],
  muscles: ListMusclesResponse,
): MuscleSetVolume[] {
  const index = buildIndex(muscles);
  const acc = new Map<string, { level: number; sets: number }>();

  const addChain = (slug: string, setCount: number) => {
    const info = index.get(slug);
    if (!info) return;
    const targets = [slug, info.l2, info.l1].filter((s): s is string => s != null);
    for (const target of new Set(targets)) {
      const targetInfo = index.get(target);
      if (!targetInfo) continue;
      const entry = acc.get(target) ?? { level: targetInfo.level, sets: 0 };
      entry.sets += setCount;
      acc.set(target, entry);
    }
  };

  for (const exercise of exercises) {
    if (exercise.setCount <= 0) continue;
    addChain(exercise.primarySlug, exercise.setCount);

    if (exercise.secondarySlug) {
      const primary = index.get(exercise.primarySlug);
      const secondary = index.get(exercise.secondarySlug);
      if (secondary && primary?.l2 !== secondary.l2) {
        addChain(exercise.secondarySlug, exercise.setCount);
      }
    }
  }

  return [...acc.entries()].map(([slug, { level, sets }]) => ({ slug, level, sets }));
}
