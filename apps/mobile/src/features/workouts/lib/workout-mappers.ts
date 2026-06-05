import {
  computeLinkedLoad,
  displayWeight,
  isSupersetGroup,
  type MeasurementType,
  measurementDimensions,
  type WeightPreference,
  type WorkoutExerciseType,
} from '@workout-tracker/domain';
import type { TFunction } from 'i18next';
import {
  composeExerciseName,
  resolveExerciseName,
  resolveVariationName,
} from '@/features/exercises/lib/format';
import type { WorkoutResponse } from '@/features/workouts/api/workouts';
import type { WorkoutCardData } from '@/features/workouts/components/WorkoutCard';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

export function toWorkoutCardData(workout: WorkoutResponse): WorkoutCardData {
  return {
    id: workout.id,
    name: workout.name,
    exerciseCount: workout.exerciseCount,
    topExercises: workout.topExercises,
    lastPerformedAt: workout.lastPerformedAt,
  };
}

export type ExerciseExecutionItem = {
  id: string;
  exerciseIndex: number;
  variationId: string;
  name: string;
  variationName: string | null;
  note: string | null;
  restSeconds: number | null;
};

export type SupersetLetter = 'A' | 'B' | 'C';

export type SupersetMember = {
  exerciseIndex: number;
  variationId: string;
  letter: SupersetLetter;
  name: string;
  variationName: string | null;
  note: string | null;
  restSeconds: number | null;
};

export type SingleExerciseItem = { kind: 'single' } & ExerciseExecutionItem;

export type SupersetGroupItem = {
  kind: 'superset';
  id: string;
  members: SupersetMember[];
  restSeconds: number | null;
};

export type ExecutionListItem = SingleExerciseItem | SupersetGroupItem;

const SUPERSET_LETTERS: SupersetLetter[] = ['A', 'B', 'C'];

export function formatSetTarget(repsMin: number | null, repsMax: number | null): string {
  if (repsMin == null || repsMax == null) return '';
  return repsMin === repsMax ? `${repsMin}` : `${repsMin}-${repsMax}`;
}

/**
 * Weight-input placeholder for a normal set, shown in the user's unit. With a
 * periodization `loadPercent` adjustment it suggests the previous session's load
 * scaled by that percentage (rounded per preference); otherwise it falls back to
 * the previous load. No previous load means no placeholder.
 */
export function weightPlaceholder(
  lastKg: number | null | undefined,
  loadPercent: number | null | undefined,
  weight: WeightPreference,
): string | undefined {
  if (lastKg == null) return undefined;
  const kg = loadPercent == null ? lastKg : computeLinkedLoad(lastKg, loadPercent, weight);
  return String(displayWeight(kg, weight.unit));
}

export type ColumnLayout = { weight: boolean; reps: boolean; duration: boolean };

export function exerciseColumnLayout(sets: { measurementType: MeasurementType }[]): ColumnLayout {
  return sets.reduce<ColumnLayout>(
    (acc, set) => {
      const dims = measurementDimensions(set.measurementType);
      return {
        weight: acc.weight || dims.weight,
        reps: acc.reps || dims.reps,
        duration: acc.duration || dims.duration,
      };
    },
    { weight: false, reps: false, duration: false },
  );
}

type ExecutionExercise = ExecutionFormInput['exercises'][number];

function toExerciseExecutionItem(
  exercise: ExecutionExercise,
  exerciseIndex: number,
  t: TFunction,
  language: string,
): ExerciseExecutionItem {
  const { variation } = exercise;
  const name = composeExerciseName(
    {
      exerciseName: resolveExerciseName(variation.exercise.slug, variation.exercise.name, t),
      equipmentName: t(`equipment.${variation.equipment.slug}`),
      equipmentPreposition: variation.equipment.preposition,
    },
    language,
  );
  const variationName = resolveVariationName(variation.slug, variation.name, t);
  return {
    id: exercise.id,
    exerciseIndex,
    variationId: variation.id,
    name,
    variationName,
    note: exercise.note,
    restSeconds: exercise.restSeconds,
  };
}

export function toExerciseExecutionItems(
  exercises: ExecutionFormInput['exercises'],
  type: WorkoutExerciseType,
  t: TFunction,
  language: string,
): ExerciseExecutionItem[] {
  return exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(({ exercise }) => exercise.exerciseType === type)
    .map(({ exercise, exerciseIndex }) =>
      toExerciseExecutionItem(exercise, exerciseIndex, t, language),
    );
}

export function listIncompleteStrengthExercises(
  exercises: ExecutionFormInput['exercises'],
  t: TFunction,
  language: string,
): string[] {
  return exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(
      ({ exercise }) =>
        exercise.exerciseType === 'strength' && exercise.sets.some((set) => !set.done),
    )
    .map(
      ({ exercise, exerciseIndex }) =>
        toExerciseExecutionItem(exercise, exerciseIndex, t, language).name,
    );
}

export function reorderExercisesWithinType(
  exercises: ExecutionFormInput['exercises'],
  type: WorkoutExerciseType,
  orderedItemIds: string[],
): ExecutionFormInput['exercises'] {
  const isType = (exercise: ExecutionExercise) => exercise.exerciseType === type;
  const rank = new Map(orderedItemIds.map((id, index) => [id, index]));

  const reordered = exercises
    .filter(isType)
    .map((exercise, index) => ({ exercise, index }))
    .sort(
      (a, b) =>
        (rank.get(a.exercise.supersetGroupId) ?? 0) - (rank.get(b.exercise.supersetGroupId) ?? 0) ||
        a.index - b.index,
    )
    .map(({ exercise }) => exercise);

  let queueIndex = 0;
  return exercises
    .map((exercise) => (isType(exercise) ? reordered[queueIndex++] : exercise))
    .map((exercise, position) => ({ ...exercise, position }));
}

function relocateGroupWithinType(
  exercises: ExecutionFormInput['exercises'],
  orderedMemberIds: string[],
  patch: (exercise: ExecutionExercise, order: number) => ExecutionExercise,
): ExecutionFormInput['exercises'] {
  if (orderedMemberIds.length === 0) return exercises;
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const first = byId.get(orderedMemberIds[0]);
  if (!first) return exercises;
  const type = first.exerciseType;
  const memberSet = new Set(orderedMemberIds);
  const orderedMembers = orderedMemberIds
    .map((id) => byId.get(id))
    .filter((exercise): exercise is ExecutionExercise => exercise != null)
    .map((exercise, order) => patch(exercise, order));

  let inserted = false;
  const newTypeList: ExecutionExercise[] = [];
  for (const exercise of exercises) {
    if (exercise.exerciseType !== type) continue;
    if (memberSet.has(exercise.id)) {
      if (!inserted) {
        newTypeList.push(...orderedMembers);
        inserted = true;
      }
      continue;
    }
    newTypeList.push(exercise);
  }

  let queueIndex = 0;
  return exercises
    .map((exercise) => (exercise.exerciseType === type ? newTypeList[queueIndex++] : exercise))
    .map((exercise, position) => ({ ...exercise, position }));
}

/**
 * Combina exercícios num superset: atribui um `supersetGroupId` comum (deve ser um
 * UUID novo, nunca igual ao `id` de um membro) e `supersetOrder` 0..n na ordem de
 * `orderedExerciseIds` (= A/B/C), movendo os membros para ficarem contíguos na menor
 * posição entre eles. `orderedExerciseIds` são sempre `exercise.id` individuais — para
 * fundir um superset existente com um single, o chamador expande o grupo nos ids dos
 * seus membros antes de passar.
 */
export function combineIntoSuperset(
  exercises: ExecutionFormInput['exercises'],
  orderedExerciseIds: string[],
  newGroupId: string,
): ExecutionFormInput['exercises'] {
  return relocateGroupWithinType(exercises, orderedExerciseIds, (exercise, order) => ({
    ...exercise,
    supersetGroupId: newGroupId,
    supersetOrder: order,
  }));
}

/** Dissolve um superset: cada membro volta a single (`supersetGroupId = id`). */
export function ungroupSuperset(
  exercises: ExecutionFormInput['exercises'],
  groupId: string,
): ExecutionFormInput['exercises'] {
  return exercises
    .map((exercise) =>
      exercise.supersetGroupId === groupId
        ? { ...exercise, supersetGroupId: exercise.id, supersetOrder: 0 }
        : exercise,
    )
    .map((exercise, position) => ({ ...exercise, position }));
}

/** Reordena os membros A/B/C de um superset conforme `orderedExerciseIds`. */
export function reorderSupersetMembers(
  exercises: ExecutionFormInput['exercises'],
  orderedExerciseIds: string[],
): ExecutionFormInput['exercises'] {
  return relocateGroupWithinType(exercises, orderedExerciseIds, (exercise, order) => ({
    ...exercise,
    supersetOrder: order,
  }));
}

export function toExecutionListItems(
  exercises: ExecutionFormInput['exercises'],
  type: WorkoutExerciseType,
  t: TFunction,
  language: string,
): ExecutionListItem[] {
  const filtered = exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(({ exercise }) => exercise.exerciseType === type);

  const groupOrder: string[] = [];
  const groups = new Map<string, { exercise: ExecutionExercise; exerciseIndex: number }[]>();
  for (const entry of filtered) {
    const groupId = entry.exercise.supersetGroupId;
    const existing = groups.get(groupId);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(groupId, [entry]);
      groupOrder.push(groupId);
    }
  }

  const items: ExecutionListItem[] = [];
  for (const groupId of groupOrder) {
    const entries = groups.get(groupId) ?? [];
    if (!isSupersetGroup(entries.map(({ exercise }) => exercise))) {
      for (const { exercise, exerciseIndex } of entries) {
        items.push({
          kind: 'single',
          ...toExerciseExecutionItem(exercise, exerciseIndex, t, language),
        });
      }
      continue;
    }
    const ordered = [...entries].sort(
      (a, b) => a.exercise.supersetOrder - b.exercise.supersetOrder,
    );
    const members: SupersetMember[] = ordered.map(({ exercise, exerciseIndex }, i) => {
      const item = toExerciseExecutionItem(exercise, exerciseIndex, t, language);
      return {
        exerciseIndex,
        variationId: item.variationId,
        letter: SUPERSET_LETTERS[i] ?? SUPERSET_LETTERS[SUPERSET_LETTERS.length - 1],
        name: item.name,
        variationName: item.variationName,
        note: item.note,
        restSeconds: item.restSeconds,
      };
    });
    items.push({
      kind: 'superset',
      id: groupId,
      members,
      restSeconds: members[members.length - 1]?.restSeconds ?? null,
    });
  }
  return items;
}
