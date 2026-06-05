import { displayWeight, lbToKg, type WeightUnit } from '@workout-tracker/domain';
import { Input } from '@workout-tracker/ui-mobile';
import { useState } from 'react';
import { parseLocalizedNumber, sanitizeDecimal } from '@/features/shared/lib/utils/numeric-input';

const MAX_WEIGHT_FRACTION_DIGITS = 2;
const MAX_KG_INTEGER_DIGITS = 3;
const MAX_LB_INTEGER_DIGITS = 4;

/** Converts the unit-string the user sees into the kg string stored in the form. */
function toKgString(text: string | undefined, unit: WeightUnit): string {
  if (!text) return '';
  if (unit === 'kg') return text;
  const value = parseLocalizedNumber(text);
  if (!Number.isFinite(value)) return '';
  return String(Math.round(lbToKg(value) * 100) / 100);
}

/** Converts the kg string stored in the form into the unit-string the user sees. */
function toDisplayText(kg: string | undefined, unit: WeightUnit): string {
  if (!kg) return '';
  if (unit === 'kg') return kg;
  const value = parseLocalizedNumber(kg);
  if (!Number.isFinite(value)) return '';
  return String(displayWeight(value, 'lb'));
}

type WeightInputProps = {
  value: string | undefined;
  onChange: (kg: string) => void;
  unit: WeightUnit;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
};

/**
 * Weight field that lets the user type in their preferred unit while the form
 * value stays in kg. For `kg` it behaves like a plain input; for `lb` it converts
 * on every edit. The shown text is derived from the kg `value` each render, so it
 * stays reactive to external changes (the linked-load cascade, autofill, the unit
 * preference loading) and shows the placeholder whenever the field is empty. The
 * user's in-progress text is preserved only while it still maps to the stored kg,
 * so typing isn't reformatted under the cursor.
 */
export function WeightInput({
  value,
  onChange,
  unit,
  onBlur,
  placeholder,
  invalid,
  className,
}: WeightInputProps) {
  const [typed, setTyped] = useState<string | null>(null);
  const display =
    typed != null && toKgString(typed, unit) === (value ?? '') ? typed : toDisplayText(value, unit);

  const maxIntegerDigits = unit === 'lb' ? MAX_LB_INTEGER_DIGITS : MAX_KG_INTEGER_DIGITS;

  return (
    <Input
      variant="outline-primary"
      keyboardType="decimal-pad"
      value={display}
      onChangeText={(text) => {
        const sanitized = sanitizeDecimal(text, {
          maxIntegerDigits,
          maxFractionDigits: MAX_WEIGHT_FRACTION_DIGITS,
        });
        setTyped(sanitized);
        onChange(toKgString(sanitized, unit));
      }}
      onBlur={onBlur}
      aria-invalid={invalid}
      className={className}
      placeholder={placeholder}
    />
  );
}
