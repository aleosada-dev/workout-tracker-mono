export type Relation<T> = T | T[] | null;

export const pickOne = <T>(value: Relation<T>): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;
