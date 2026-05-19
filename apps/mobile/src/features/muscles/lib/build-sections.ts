import type { TFunction } from 'i18next';
import type { ListMuscleResponseItem } from '@/features/muscles/api/muscles';

export type MuscleSectionItem = {
  value: string;
  label: string;
  children?: MuscleSectionItem[];
};

export type MuscleSection = {
  id: string;
  label: string;
  items: MuscleSectionItem[];
};

type NestedMuscle = ListMuscleResponseItem & { children?: NestedMuscle[] };

function translate(t: TFunction, slug: string): string {
  return t(`muscles.${slug}` as never);
}

export function buildMuscleSections(
  muscles: ListMuscleResponseItem[],
  t: TFunction,
): MuscleSection[] {
  return (muscles as NestedMuscle[])
    .filter((m) => m.level === 1)
    .map((region) => ({
      id: region.id,
      label: translate(t, region.slug),
      items: (region.children ?? []).map((group) => ({
        value: group.id,
        label: translate(t, group.slug),
        children: (group.children ?? []).map((specific) => ({
          value: specific.id,
          label: translate(t, specific.slug),
        })),
      })),
    }));
}

export function buildLabelMap(sections: MuscleSection[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of sections) {
    for (const item of section.items) {
      map[item.value] = item.label;
      if (item.children) {
        for (const child of item.children) {
          map[child.value] = child.label;
        }
      }
    }
  }
  return map;
}
