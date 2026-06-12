import { deriveRoundOrders } from '../../set/sets';
import type {
  WorkoutDetail,
  WorkoutDetailExercise,
  WorkoutDetailSet,
} from '../../workouts/workout';
import type { WorkoutOverrideOp, WorkoutSetValue } from '../adjustment';

type MutExercise = WorkoutDetailExercise & { removed: boolean };

function toSet(value: WorkoutSetValue, id: string, setOrder: number): WorkoutDetailSet {
  return {
    id,
    setOrder,
    setType: value.setType,
    measurementType: value.measurementType,
    repsMin: value.repsMin,
    repsMax: value.repsMax,
    durationSeconds: value.durationSeconds,
    distanceMeters: value.distanceMeters,
    linkedSetId: null,
    loadPercent: value.loadPercent,
    loadPercentOfPrevious: value.loadPercentOfPrevious,
    roundOrder: 0,
  };
}

function isIntraSessionPercent(setType: WorkoutDetailSet['setType']): boolean {
  return setType === 'drop' || setType === 'cluster';
}

function reindexSets(ex: MutExercise): void {
  ex.sets.forEach((set, i) => {
    set.setOrder = i;
  });
}

function applyOp(exercises: MutExercise[], op: WorkoutOverrideOp): void {
  if (op.kind === 'add_exercise') {
    if (exercises.some((e) => e.variation.id === op.variationId)) return;
    const pos = Math.min(Math.max(op.position, 0), exercises.length);
    exercises.splice(pos, 0, {
      id: op.variationId,
      exerciseType: op.exercise.exerciseType,
      position: pos,
      supersetGroupId: op.exercise.supersetGroupId,
      supersetOrder: op.exercise.supersetOrder,
      note: op.exercise.note,
      restSeconds: op.exercise.restSeconds,
      alternativeOfId: null,
      variation: op.exercise.variation,
      sets: op.exercise.sets.map((s, i) => toSet(s, `${op.variationId}:set:${i}`, i)),
      removed: false,
    });
    return;
  }

  const ex = exercises.find((e) => e.variation.id === op.variationId);
  if (!ex || ex.removed) return;

  switch (op.kind) {
    case 'remove_exercise':
      ex.removed = true;
      return;
    case 'add_set': {
      const pos = Math.min(Math.max(op.position, 0), ex.sets.length);
      ex.sets.splice(pos, 0, toSet(op.set, `${ex.id}:added:${pos}`, pos));
      reindexSets(ex);
      return;
    }
    case 'remove_set':
      if (op.setIndex >= 0 && op.setIndex < ex.sets.length) {
        ex.sets.splice(op.setIndex, 1);
        reindexSets(ex);
      }
      return;
    case 'change_set_type': {
      const set = ex.sets[op.setIndex];
      if (set) set.setType = op.setType;
      return;
    }
    case 'change_set_value': {
      const set = ex.sets[op.setIndex];
      if (!set) return;
      if (op.field === 'load') {
        if (isIntraSessionPercent(set.setType)) set.loadPercentOfPrevious = op.value;
        else set.loadPercent = op.value;
      } else {
        set[op.field] = op.value;
      }
      return;
    }
  }
}

/** Applies workout-override ops to a base workout, producing the materialized workout. */
export function materializeWorkout(
  base: WorkoutDetail,
  opsList: WorkoutOverrideOp[][],
): WorkoutDetail {
  const mut: MutExercise[] = base.exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s })),
    removed: false,
  }));

  for (const ops of opsList) {
    for (const op of ops) applyOp(mut, op);
  }

  const exercises: WorkoutDetailExercise[] = mut
    .filter((e) => !e.removed)
    .map(({ removed: _removed, ...ex }, position) => {
      const rounds = deriveRoundOrders(ex.sets.map((s) => ({ type: s.setType })));
      return {
        ...ex,
        position,
        sets: ex.sets.map((set, i) => ({ ...set, roundOrder: rounds[i] })),
      };
    });

  return { ...base, exercises };
}
