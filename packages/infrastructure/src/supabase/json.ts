/** Narrowing helpers for untyped `jsonb` columns decoded as `unknown`. */

export type Json = Record<string, unknown>;

export const isJsonObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null;

export const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const asInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null;

/** Returns the int, `null` when explicitly null, or `undefined` when the value is malformed. */
export const asIntOrNull = (value: unknown): number | null | undefined => {
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
};
