import { MAX_DISTANCE_METERS } from '@workout-tracker/domain';
import { Input, Text } from '@workout-tracker/ui-mobile';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { formatTime, sanitizeDecimal, sanitizeInteger } from '@/features/shared/lib/utils';
import { parseLocalizedNumber } from '@/features/shared/lib/utils/numeric-input';
import {
  DurationPickerSheet,
  type DurationPickerSheetRef,
} from '@/features/workouts/components/DurationPickerSheet';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

const MAX_KM_INTEGER_DIGITS = 3;
const MAX_KM_FRACTION_DIGITS = 2;

export type DistanceUnit = 'm' | 'km';

/** Picks the unit a distance field should default to given its target in meters. */
export function defaultDistanceUnit(targetMeters: number | null | undefined): DistanceUnit {
  return targetMeters != null && targetMeters > 1000 ? 'km' : 'm';
}

/** Renders the stored meters in the display unit, dropping trailing km zeros. */
function metersToText(meters: string, unit: DistanceUnit): string {
  if (meters === '') return '';
  const n = Number(meters);
  if (!Number.isFinite(n)) return '';
  if (unit === 'm') return String(n);
  const km = n / 1000;
  return Number.isInteger(km) ? String(km) : String(km).replace(/0+$/, '');
}

/** Converts the typed display value back to integer meters (string), or '' when empty. */
function textToMeters(text: string, unit: DistanceUnit): string {
  if (text === '') return '';
  const value = parseLocalizedNumber(text);
  if (!Number.isFinite(value)) return '';
  const meters = unit === 'km' ? Math.round(value * 1000) : Math.round(value);
  return meters > 0 ? String(meters) : '';
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : Number(km.toFixed(2))} km`;
  }
  return `${meters} m`;
}

/** The m/km toggle shown once in the distance column header — the unit is shared
 * across all of the exercise's distance sets, so a per-row button would be
 * redundant. Tapping it flips the unit for the whole column. */
export function DistanceUnitToggle({
  unit,
  onToggle,
  testID,
}: {
  unit: DistanceUnit;
  onToggle: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      testID={testID}
      className="h-6 w-7 items-center justify-center rounded-md bg-secondary"
    >
      <Text className="font-sans-semibold text-secondary-foreground text-xs">{unit}</Text>
    </Pressable>
  );
}

/**
 * Numeric distance input. The value is always stored in meters; the `unit` (owned
 * by the parent and toggled from the column header) only changes how it's typed and
 * shown, and is shared across the exercise's sets. Local `text` keeps in-progress
 * decimal entry smooth and is re-derived when the unit flips or the stored value
 * changes from outside (e.g. a target autofill).
 */
export function DistanceInput({
  value,
  onChange,
  onBlur,
  invalid,
  lastMeters: lastMetersValue = null,
  unit,
  testID,
}: {
  value: string;
  onChange: (meters: string) => void;
  onBlur: () => void;
  invalid: boolean;
  lastMeters?: number | null;
  unit: DistanceUnit;
  testID?: string;
}) {
  const [text, setText] = useState(() => metersToText(value, unit));
  const lastMeters = useRef(value);
  const lastUnit = useRef(unit);
  const placeholder =
    lastMetersValue != null ? metersToText(String(lastMetersValue), unit) : undefined;

  useEffect(() => {
    if (value !== lastMeters.current || unit !== lastUnit.current) {
      lastMeters.current = value;
      lastUnit.current = unit;
      setText(metersToText(value, unit));
    }
  }, [value, unit]);

  const handleText = (next: string) => {
    const sanitized =
      unit === 'km'
        ? sanitizeDecimal(next, {
            maxIntegerDigits: MAX_KM_INTEGER_DIGITS,
            maxFractionDigits: MAX_KM_FRACTION_DIGITS,
          })
        : sanitizeInteger(next, { max: MAX_DISTANCE_METERS });
    setText(sanitized);
    const meters = textToMeters(sanitized, unit);
    lastMeters.current = meters;
    onChange(meters);
  };

  return (
    <View className="w-32 px-2">
      <Input
        variant="outline-primary"
        keyboardType={unit === 'km' ? 'decimal-pad' : 'number-pad'}
        value={text}
        onChangeText={handleText}
        onBlur={onBlur}
        aria-invalid={invalid}
        className="h-8 py-0 text-sm"
        placeholder={placeholder}
        testID={testID}
      />
    </View>
  );
}

/**
 * Duration cell without a live timer — used by the superset card, where one
 * member's countdown can't drive the round's shared "done". Tap to set the time
 * via the picker; the single-exercise card keeps its richer timer row.
 */
export function DurationPickerCell({
  exerciseIndex,
  setIndex,
  setsPath,
}: {
  exerciseIndex: number;
  setIndex: number;
  setsPath?: `exercises.${number}.sets` | `exercises.${number}.alternative.sets`;
}) {
  const { control } = useFormContext<ExecutionFormInput>();
  const resolvedSetsPath = setsPath ?? (`exercises.${exerciseIndex}.sets` as const);
  const basePath = `${resolvedSetsPath}.${setIndex}` as const;
  const testIDBase = resolvedSetsPath.includes('.alternative.')
    ? `workout-execution.alternative.set-${setIndex}`
    : `workout-execution.set-${setIndex}`;
  const lastDuration = useWatch({ control, name: `${basePath}.lastDuration` });
  const sheetRef = useRef<DurationPickerSheetRef>(null);

  return (
    <View className="w-28 px-2">
      <Controller
        control={control}
        name={`${basePath}.duration`}
        render={({ field, fieldState }) => {
          const hasValue = field.value !== '';
          return (
            <Pressable
              onPress={() =>
                sheetRef.current?.present(
                  hasValue ? Number(field.value) : 0,
                  (secs) => field.onChange(String(secs)),
                  () => field.onChange(''),
                )
              }
              accessibilityRole="button"
              testID={`${testIDBase}.duration`}
              className={`h-8 items-center justify-center border-b ${
                fieldState.invalid ? 'border-destructive' : 'border-primary'
              }`}
            >
              <Text className={`text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>
                {formatTime(hasValue ? Number(field.value) : (lastDuration ?? 0))}
              </Text>
            </Pressable>
          );
        }}
      />
      <DurationPickerSheet ref={sheetRef} />
    </View>
  );
}
