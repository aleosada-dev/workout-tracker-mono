export type Propagation = {
  cycleStart: number;
  cycleEnd: number | null;
  cycleEvery: number;
};

export function propagationMatches(cycle: number, propagation: Propagation): boolean {
  if (propagation.cycleEvery < 1) return false;
  if (cycle < propagation.cycleStart) return false;
  if (propagation.cycleEnd !== null && cycle > propagation.cycleEnd) return false;
  return (cycle - propagation.cycleStart) % propagation.cycleEvery === 0;
}
