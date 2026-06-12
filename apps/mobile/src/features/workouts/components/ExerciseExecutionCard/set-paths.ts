// The principal and alternative execution sets share the same field shape, so
// the alternative path (`exercises.N.alternative.sets`) is treated as this
// principal-shaped type to keep RHF's field-path resolution non-optional. The
// alternative path is produced via `alternativeSetsPath` and is valid at runtime.
export type ExecutionSetsPath = `exercises.${number}.sets`;

export function alternativeSetsPath(exerciseIndex: number): ExecutionSetsPath {
  return `exercises.${exerciseIndex}.alternative.sets` as unknown as ExecutionSetsPath;
}
