import type { LogicalKey, SetLike, WithLogicalKey } from './logical-key';
import { assignLogicalKeys } from './logical-key';

export type SetMatch<A, B> = {
  logicalKey: LogicalKey;
  a: WithLogicalKey<A> | null;
  b: WithLogicalKey<B> | null;
};

type MaxCounts = {
  warmup: number;
  normal: number;
  dropByNormal: Map<number, number>;
  clusterByNormal: Map<number, number>;
};

function scanCounts(keys: Iterable<LogicalKey>): MaxCounts {
  const counts: MaxCounts = {
    warmup: 0,
    normal: 0,
    dropByNormal: new Map(),
    clusterByNormal: new Map(),
  };
  for (const key of keys) {
    const warmup = /^warmup-(\d+)$/.exec(key);
    if (warmup) {
      counts.warmup = Math.max(counts.warmup, Number(warmup[1]));
      continue;
    }
    const normal = /^normal-(\d+)$/.exec(key);
    if (normal) {
      counts.normal = Math.max(counts.normal, Number(normal[1]));
      continue;
    }
    const nested = /^n(\d+)-(drop|cluster)-(\d+)$/.exec(key);
    if (nested) {
      const parent = Number(nested[1]);
      const kind = nested[2] as 'drop' | 'cluster';
      const idx = Number(nested[3]);
      counts.normal = Math.max(counts.normal, parent);
      const bucket = kind === 'drop' ? counts.dropByNormal : counts.clusterByNormal;
      bucket.set(parent, Math.max(bucket.get(parent) ?? 0, idx));
    }
  }
  return counts;
}

function canonicalOrder(present: Set<LogicalKey>, counts: MaxCounts): LogicalKey[] {
  const out: LogicalKey[] = [];
  for (let w = 1; w <= counts.warmup; w++) {
    const key = `warmup-${w}`;
    if (present.has(key)) out.push(key);
  }
  for (let n = 1; n <= counts.normal; n++) {
    const normalKey = `normal-${n}`;
    if (present.has(normalKey)) out.push(normalKey);
    const maxDrop = counts.dropByNormal.get(n) ?? 0;
    for (let d = 1; d <= maxDrop; d++) {
      const key = `n${n}-drop-${d}`;
      if (present.has(key)) out.push(key);
    }
    const maxCluster = counts.clusterByNormal.get(n) ?? 0;
    for (let c = 1; c <= maxCluster; c++) {
      const key = `n${n}-cluster-${c}`;
      if (present.has(key)) out.push(key);
    }
  }
  return out;
}

export function matchSets<A extends SetLike, B extends SetLike>(
  a: A[],
  b: B[],
): Array<SetMatch<A, B>> {
  const aKeyed = assignLogicalKeys(a);
  const bKeyed = assignLogicalKeys(b);

  const aByKey = new Map<LogicalKey, WithLogicalKey<A>>();
  for (const row of aKeyed) aByKey.set(row.logicalKey, row);
  const bByKey = new Map<LogicalKey, WithLogicalKey<B>>();
  for (const row of bKeyed) bByKey.set(row.logicalKey, row);

  const present = new Set<LogicalKey>([...aByKey.keys(), ...bByKey.keys()]);
  const counts = scanCounts(present);
  const order = canonicalOrder(present, counts);

  return order.map((logicalKey) => ({
    logicalKey,
    a: aByKey.get(logicalKey) ?? null,
    b: bByKey.get(logicalKey) ?? null,
  }));
}
