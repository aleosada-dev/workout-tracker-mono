import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMuscles } from '@/features/muscles/hooks/use-muscles';
import { buildLabelMap, buildMuscleSections } from '@/features/muscles/lib/build-sections';

export function useMuscleSections() {
  const { t } = useTranslation();
  const { data } = useMuscles();

  const sections = useMemo(() => buildMuscleSections(data ?? [], t), [data, t]);
  const labels = useMemo(() => buildLabelMap(sections), [sections]);

  return { sections, labels };
}
