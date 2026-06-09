import type {
  AdjustmentPayload,
  ExerciseMeasurementType,
  PeriodizationAdjustment,
  WorkoutOverrideNewExercise,
  WorkoutOverrideOp,
  WorkoutSetValue,
} from '@workout-tracker/domain';
import { asInt, asIntOrNull, asString, isJsonObject } from '../supabase/json';

export type AdjustmentRow = {
  id: string;
  periodization_id: string;
  cycle_start: number | null;
  cycle_end: number | null;
  cycle_every: number | null;
  type: string;
  payload: unknown;
  created_at: string;
};

// The adjustment `payload` is stored as untyped jsonb in the legacy shape:
// `workout_override` carries `activityIndex` (maps to the occurrence's
// positionInDay) and a single set field named `loadPercent` that carries two
// regimes depending on the set type: for normal/warmup it is a percentage of
// the previous session's load (domain `loadPercent`), while for drop/cluster it
// is a percentage of the previous in-session set (domain `loadPercentOfPrevious`).
// We route it by set type here so the domain/materialize layer only deals with
// the two explicit fields of the current model.

function isIntraSessionPercent(setType: WorkoutSetValue['setType']): boolean {
  return setType === 'drop' || setType === 'cluster';
}

function parseSetValue(value: unknown): WorkoutSetValue | null {
  if (!isJsonObject(value)) return null;
  const setType = asString(value.setType) as WorkoutSetValue['setType'] | null;
  if (!setType) return null;
  const repsMin = asIntOrNull(value.repsMin);
  const repsMax = asIntOrNull(value.repsMax);
  const durationSeconds = asIntOrNull(value.durationSeconds) ?? null;
  const loadPercent = asIntOrNull(value.loadPercent);
  if (repsMin === undefined || repsMax === undefined || loadPercent === undefined) {
    return null;
  }
  const intraSession = isIntraSessionPercent(setType);
  return {
    setType,
    measurementType: (asString(value.measurementType) ??
      'weight_reps') as WorkoutSetValue['measurementType'],
    repsMin,
    repsMax,
    durationSeconds,
    loadPercent: intraSession ? null : loadPercent,
    loadPercentOfPrevious: intraSession ? loadPercent : null,
  };
}

function parseNewExercise(value: unknown, variationId: string): WorkoutOverrideNewExercise | null {
  if (!isJsonObject(value)) return null;
  const name = asString(value.name);
  const supersetGroupId = asString(value.supersetGroupId);
  const supersetOrder = asInt(value.supersetOrder);
  const sets = Array.isArray(value.sets)
    ? value.sets.map(parseSetValue).filter((s): s is WorkoutSetValue => s !== null)
    : [];
  if (!name || !supersetGroupId || supersetOrder === null || sets.length === 0) return null;
  return {
    exerciseType: 'strength',
    supersetGroupId,
    supersetOrder,
    note: null,
    restSeconds: asInt(value.restSeconds),
    variation: {
      id: variationId,
      slug: null,
      name: asString(value.variationName),
      exercise: { slug: null, name, type: 'musculacao' },
      measurementType: (asString(value.measurementType) ??
        'weight_reps') as ExerciseMeasurementType,
      equipment: { slug: '', preposition: asString(value.equipmentPreposition) ?? '' },
      muscle: { slug: '' },
      secondaryMuscle: null,
    },
    sets,
  };
}

function parseOp(value: unknown): WorkoutOverrideOp | null {
  if (!isJsonObject(value)) return null;
  const variationId = asString(value.variationId);
  if (!variationId) return null;
  switch (value.kind) {
    case 'remove_exercise':
      return { kind: 'remove_exercise', variationId };
    case 'add_exercise': {
      const position = asInt(value.position);
      const exercise = parseNewExercise(value.exercise, variationId);
      if (position === null || !exercise) return null;
      return { kind: 'add_exercise', variationId, position, exercise };
    }
    case 'add_set': {
      const position = asInt(value.position);
      const set = parseSetValue(value.set);
      if (position === null || !set) return null;
      return { kind: 'add_set', variationId, position, set };
    }
    case 'remove_set': {
      const setIndex = asInt(value.setIndex);
      if (setIndex === null) return null;
      return { kind: 'remove_set', variationId, setIndex };
    }
    case 'change_set_type': {
      const setIndex = asInt(value.setIndex);
      const setType = asString(value.setType);
      if (setIndex === null || !setType) return null;
      return {
        kind: 'change_set_type',
        variationId,
        setIndex,
        setType: setType as WorkoutSetValue['setType'],
      };
    }
    case 'change_set_value': {
      const setIndex = asInt(value.setIndex);
      const rawField = asString(value.field);
      const v = asInt(value.value);
      // Legacy `loadPercent`/`loadPercentOfPrevious` collapse to the neutral
      // `load` field; materialize routes it to the right column by set type.
      const field =
        rawField === 'loadPercent' || rawField === 'loadPercentOfPrevious'
          ? 'load'
          : rawField === 'repsMin' || rawField === 'repsMax'
            ? rawField
            : null;
      if (setIndex === null || v === null || field === null) return null;
      return { kind: 'change_set_value', variationId, setIndex, field, value: v };
    }
    default:
      return null;
  }
}

function parsePayload(type: string, payload: unknown): AdjustmentPayload | null {
  if (!isJsonObject(payload)) return null;
  if (type === 'workout_override') {
    const workoutId = asString(payload.workoutId);
    // Legacy payloads name this `activityIndex`; it matches the occurrence's positionInDay.
    const positionInDay = asInt(payload.activityIndex) ?? asInt(payload.positionInDay);
    if (!workoutId || positionInDay === null || !Array.isArray(payload.ops)) return null;
    const ops = payload.ops.map(parseOp).filter((op): op is WorkoutOverrideOp => op !== null);
    return { type: 'workout_override', workoutId, positionInDay, ops };
  }
  if (type === 'note') {
    const text = asString(payload.text);
    if (!text) return null;
    return { type: 'note', workoutId: asString(payload.workoutId), text };
  }
  return null;
}

/** Maps a raw adjustment row to the domain type, or null for unsupported/malformed payloads. */
export const toAdjustment = (row: AdjustmentRow): PeriodizationAdjustment | null => {
  const payload = parsePayload(row.type, row.payload);
  if (!payload) return null;
  return {
    id: row.id,
    periodizationId: row.periodization_id,
    cycleStart: row.cycle_start,
    cycleEnd: row.cycle_end,
    cycleEvery: row.cycle_every,
    type: payload.type,
    payload,
    createdAt: row.created_at,
  };
};
