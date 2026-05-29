import type { WorkoutSetType } from '../../set/sets';

export type LogicalKey = string;

export type SetLike = { setType: WorkoutSetType; setOrder: number };

export type WithLogicalKey<T> = T & { logicalKey: LogicalKey };

export function assignLogicalKeys<T extends SetLike>(sets: T[]): Array<WithLogicalKey<T>> {
  if (sets.length === 0) return [];

  const indexed = sets.map((s, originalIndex) => ({ s, originalIndex }));

  const sorted = [...indexed].sort((a, b) => {
    const aW = a.s.setType === 'warmup' ? 0 : 1;
    const bW = b.s.setType === 'warmup' ? 0 : 1;
    if (aW !== bW) return aW - bW;
    return a.s.setOrder - b.s.setOrder;
  });

  const keyByOriginalIndex = new Array<LogicalKey>(sets.length);
  let warmup = 0;
  let normal = 0;
  let drop = 0;
  let cluster = 0;

  for (const { s, originalIndex } of sorted) {
    let key: LogicalKey;
    if (s.setType === 'warmup') {
      warmup += 1;
      key = `warmup-${warmup}`;
    } else if (s.setType === 'normal') {
      normal += 1;
      drop = 0;
      cluster = 0;
      key = `normal-${normal}`;
    } else if (s.setType === 'drop') {
      drop += 1;
      key = `n${normal}-drop-${drop}`;
    } else {
      cluster += 1;
      key = `n${normal}-cluster-${cluster}`;
    }
    keyByOriginalIndex[originalIndex] = key;
  }

  return sets.map((s, i) => ({ ...s, logicalKey: keyByOriginalIndex[i] as LogicalKey }));
}
