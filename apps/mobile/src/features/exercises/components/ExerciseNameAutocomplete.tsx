import { Autocomplete } from '@workout-tracker/ui-mobile';
import { useMemo } from 'react';
import { useExercises } from '@/features/exercises/hooks/use-exercises';
import { normalizeString } from '@/features/shared/lib/utils';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  /** Portal host (mounted in the current screen) the suggestion list renders into. */
  portalHost?: string;
};

/**
 * Exercise-name field with autocomplete. Suggests existing exercises the user
 * can see (their own + the public library) as they type; the user is free to
 * keep typing a brand-new name.
 */
export function ExerciseNameAutocomplete({
  value,
  onChangeText,
  placeholder,
  testID,
  portalHost,
}: Props) {
  const { data } = useExercises();

  const names = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const e of data ?? []) {
      const key = normalizeString(e.name);
      if (!byKey.has(key)) byKey.set(key, e.name);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [data]);

  return (
    <Autocomplete
      value={value}
      onChangeText={onChangeText}
      options={names}
      placeholder={placeholder}
      testID={testID}
      portalHost={portalHost}
    />
  );
}
