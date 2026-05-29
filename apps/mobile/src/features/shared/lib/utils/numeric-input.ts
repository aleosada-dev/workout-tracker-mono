export type SanitizeIntegerOptions = { max?: number };

export type SanitizeDecimalOptions = {
  maxIntegerDigits?: number;
  maxFractionDigits?: number;
};

/**
 * Strips non-digits and clamps to `max`. Returns '' for empty/invalid input.
 * Drops leading zeros (so `01` → `1`, `0` → `''`).
 */
export function sanitizeInteger(input: string, options: SanitizeIntegerOptions = {}): string {
  const digits = input.replace(/\D/g, '');
  if (digits === '') return '';
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const clamped = options.max !== undefined ? Math.min(options.max, parsed) : parsed;
  return String(clamped);
}

/**
 * Keeps a decimal-shaped string with at most `maxIntegerDigits` before the
 * separator and `maxFractionDigits` after. Accepts both `,` and `.` as
 * separators (whichever the user typed is preserved). Requires at least one
 * integer digit before allowing a separator.
 */
export function sanitizeDecimal(input: string, options: SanitizeDecimalOptions = {}): string {
  const {
    maxIntegerDigits = Number.POSITIVE_INFINITY,
    maxFractionDigits = Number.POSITIVE_INFINITY,
  } = options;
  let intCount = 0;
  let fracCount = 0;
  let seenSeparator = false;
  let result = '';
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      if (!seenSeparator) {
        if (intCount < maxIntegerDigits) {
          result += ch;
          intCount += 1;
        }
      } else if (fracCount < maxFractionDigits) {
        result += ch;
        fracCount += 1;
      }
    } else if ((ch === ',' || ch === '.') && !seenSeparator && intCount > 0) {
      result += ch;
      seenSeparator = true;
    }
  }
  return result;
}

/** Parses a localized decimal string ('12,5' or '12.5') into a number. */
export function parseLocalizedNumber(input: string): number {
  return Number(input.replace(',', '.'));
}

/** Returns the number of digits after the decimal separator. */
export function countFractionDigits(input: string): number {
  const normalized = input.replace(',', '.');
  const idx = normalized.indexOf('.');
  return idx === -1 ? 0 : normalized.length - idx - 1;
}
