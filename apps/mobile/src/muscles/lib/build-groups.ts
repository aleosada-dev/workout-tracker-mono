import type { TFunction } from 'i18next';
import type { ApiMuscle } from '@/muscles/api/muscles';

export type MuscleGroupItem = {
  value: string;
  label: string;
  children?: MuscleGroupItem[];
};

export type MuscleGroup = {
  id: string;
  label: string;
  items: MuscleGroupItem[];
};

type NestedMuscle = ApiMuscle & { children?: NestedMuscle[] };

function translate(t: TFunction, slug: string): string {
  return t(`muscles.${slug}` as never);
}

export function buildGroups(muscles: ApiMuscle[], t: TFunction): MuscleGroup[] {
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

export function buildLabelMap(groups: MuscleGroup[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of groups) {
    for (const item of group.items) {
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
