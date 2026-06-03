import { Autocomplete } from '@workout-tracker/ui-mobile';
import { useMemo, useState } from 'react';
import type { CoachAthleteResponse } from '@/features/coaches/api/coaches';

type Props = {
  athletes: CoachAthleteResponse[];
  selected: CoachAthleteResponse | null;
  onSelect: (athlete: CoachAthleteResponse) => void;
  onClear: () => void;
  placeholder?: string;
  testID?: string;
  portalHost?: string;
  inBottomSheet?: boolean;
  clearable?: boolean;
};

const fallbackName = (athleteId: string) => `Atleta ${athleteId.slice(0, 4)}`;

const labelOf = (a: CoachAthleteResponse) =>
  a.fullName?.trim() ? a.fullName.trim() : fallbackName(a.athleteId);

/**
 * Strict-selection autocomplete over the coach's athletes. The value committed
 * to the parent is `null` until the user picks one of the suggestions; any
 * keystroke after a selection clears it again, so the parent's confirm button
 * stays disabled while the field doesn't match a real athlete.
 */
export function CoachAthleteAutocomplete({
  athletes,
  selected,
  onSelect,
  onClear,
  placeholder,
  testID,
  portalHost,
  inBottomSheet,
  clearable,
}: Props) {
  const [text, setText] = useState(selected ? labelOf(selected) : '');

  const labelToAthlete = useMemo(() => {
    const map = new Map<string, CoachAthleteResponse>();
    for (const a of athletes) map.set(labelOf(a), a);
    return map;
  }, [athletes]);

  const options = useMemo(
    () => [...labelToAthlete.keys()].sort((a, b) => a.localeCompare(b)),
    [labelToAthlete],
  );

  const handleChangeText = (next: string) => {
    setText(next);
    if (selected && next !== labelOf(selected)) onClear();
  };

  const handleSelect = (label: string) => {
    const athlete = labelToAthlete.get(label);
    if (athlete) onSelect(athlete);
  };

  return (
    <Autocomplete
      value={text}
      onChangeText={handleChangeText}
      onSelect={handleSelect}
      options={options}
      placeholder={placeholder}
      testID={testID}
      portalHost={portalHost}
      inBottomSheet={inBottomSheet}
      clearable={clearable}
      minChars={1}
    />
  );
}
