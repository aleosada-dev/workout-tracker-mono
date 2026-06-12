import {
  computeLinkedLoad,
  isSupersetGroup,
  type LoadRoundingMode,
  type MeasurementType,
  measurementDimensions,
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

/** Resumo leve do alternativo, para o swap (execução) e o sub-bloco (builder). */
export type AlternativeDescriptor = { name: string; variationName: string | null } | null;

export type ExerciseExecutionItem = {
  id: string;
  exerciseIndex: number;
  variationId: string;
  aliasId: string | null;
  name: string;
  variationName: string | null;
  note: string | null;
  restSeconds: number | null;
  alternative: AlternativeDescriptor;
};

export type SupersetLetter = 'A' | 'B' | 'C';

export type SupersetMember = {
  exerciseIndex: number;
  variationId: string;
  aliasId: string | null;
  letter: SupersetLetter;
  name: string;
  variationName: string | null;
  note: string | null;
  restSeconds: number | null;
  alternative: AlternativeDescriptor;
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
 * Weight-input placeholder for a normal set. With a periodization `loadPercent`
 * adjustment it suggests the previous session's load scaled by that percentage
 * (rounded per preference); otherwise it falls back to the previous load. No
 * previous load means no placeholder.
 */
export function weightPlaceholder(
  lastKg: number | null | undefined,
  loadPercent: number | null | undefined,
  mode: LoadRoundingMode,
): string | undefined {
  if (lastKg == null) return undefined;
  if (loadPercent == null) return String(lastKg);
  return String(computeLinkedLoad(lastKg, loadPercent, mode));
}

export type ColumnLayout = {
  weight: boolean;
  reps: boolean;
  duration: boolean;
  distance: boolean;
};

export function exerciseColumnLayout(sets: { measurementType: MeasurementType }[]): ColumnLayout {
  return sets.reduce<ColumnLayout>(
    (acc, set) => {
      const dims = measurementDimensions(set.measurementType);
      return {
        weight: acc.weight || dims.weight,
        reps: acc.reps || dims.reps,
        duration: acc.duration || dims.duration,
        distance: acc.distance || dims.distance,
      };
    },
    { weight: false, reps: false, duration: false, distance: false },
  );
}

export type MappableExerciseVariation = {
  id: string;
  slug: string | null;
  name: string | null;
  exercise: { slug: string | null; name: string };
  equipment: { slug: string; preposition: string };
};

export type MappableExercise = {
  id: string;
  exerciseType: WorkoutExerciseType;
  position: number;
  supersetGroupId: string;
  supersetOrder: number;
  note: string | null;
  restSeconds: number | null;
  aliasId?: string | null;
  variation: MappableExerciseVariation;
  alternative?: { variation: MappableExerciseVariation } | null;
};

function composeVariationDisplay(
  variation: MappableExerciseVariation,
  t: TFunction,
  language: string,
): { name: string; variationName: string | null } {
  const name = composeExerciseName(
    {
      exerciseName: resolveExerciseName(variation.exercise.slug, variation.exercise.name, t),
      equipmentName: t(`equipment.${variation.equipment.slug}`),
      equipmentPreposition: variation.equipment.preposition,
      equipmentSlug: variation.equipment.slug,
    },
    language,
  );
  const variationName = resolveVariationName(variation.slug, variation.name, t);
  return { name, variationName };
}

function toExerciseExecutionItem(
  exercise: MappableExercise,
  exerciseIndex: number,
  t: TFunction,
  language: string,
): ExerciseExecutionItem {
  const { name, variationName } = composeVariationDisplay(exercise.variation, t, language);
  return {
    id: exercise.id,
    exerciseIndex,
    variationId: exercise.variation.id,
    aliasId: exercise.aliasId ?? null,
    name,
    variationName,
    note: exercise.note,
    restSeconds: exercise.restSeconds,
    alternative: exercise.alternative
      ? composeVariationDisplay(exercise.alternative.variation, t, language)
      : null,
  };
}

export function toExerciseExecutionItems(
  exercises: readonly MappableExercise[],
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
    .filter(({ exercise }) => {
      const activeSets =
        exercise.usingAlternative && exercise.alternative
          ? exercise.alternative.sets
          : exercise.sets;
      return exercise.exerciseType === 'strength' && activeSets.some((set) => !set.done);
    })
    .map(
      ({ exercise, exerciseIndex }) =>
        toExerciseExecutionItem(exercise, exerciseIndex, t, language).name,
    );
}

export function reorderExercisesWithinType<T extends MappableExercise>(
  exercises: T[],
  type: WorkoutExerciseType,
  orderedItemIds: string[],
): T[] {
  const isType = (exercise: T) => exercise.exerciseType === type;
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

function relocateGroupWithinType<T extends MappableExercise>(
  exercises: T[],
  orderedMemberIds: string[],
  patch: (exercise: T, order: number) => T,
): T[] {
  if (orderedMemberIds.length === 0) return exercises;
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const first = byId.get(orderedMemberIds[0]);
  if (!first) return exercises;
  const type = first.exerciseType;
  const memberSet = new Set(orderedMemberIds);
  const orderedMembers = orderedMemberIds
    .map((id) => byId.get(id))
    .filter((exercise): exercise is T => exercise != null)
    .map((exercise, order) => patch(exercise, order));

  let inserted = false;
  const newTypeList: T[] = [];
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
export function combineIntoSuperset<T extends MappableExercise>(
  exercises: T[],
  orderedExerciseIds: string[],
  newGroupId: string,
): T[] {
  const memberIds = new Set(orderedExerciseIds);
  const unifiedRestSeconds = exercises.reduce<number | null>(
    (max, exercise) =>
      memberIds.has(exercise.id) &&
      exercise.restSeconds != null &&
      exercise.restSeconds > (max ?? -1)
        ? exercise.restSeconds
        : max,
    null,
  );
  return relocateGroupWithinType(exercises, orderedExerciseIds, (exercise, order) => ({
    ...exercise,
    supersetGroupId: newGroupId,
    supersetOrder: order,
    restSeconds: unifiedRestSeconds,
  }));
}

/** Dissolve um superset: cada membro volta a single (`supersetGroupId = id`). */
export function ungroupSuperset<T extends MappableExercise>(exercises: T[], groupId: string): T[] {
  return exercises
    .map((exercise) =>
      exercise.supersetGroupId === groupId
        ? { ...exercise, supersetGroupId: exercise.id, supersetOrder: 0 }
        : exercise,
    )
    .map((exercise, position) => ({ ...exercise, position }));
}

/** Reordena os membros A/B/C de um superset conforme `orderedExerciseIds`. */
export function reorderSupersetMembers<T extends MappableExercise>(
  exercises: T[],
  orderedExerciseIds: string[],
): T[] {
  return relocateGroupWithinType(exercises, orderedExerciseIds, (exercise, order) => ({
    ...exercise,
    supersetOrder: order,
  }));
}

export type RoundMemberView = {
  exerciseIndex: number;
  letter: SupersetLetter;
  setIndexes: number[];
  ids: string[];
};

/**
 * Agrupa os sets dos membros de um superset por round (série): cada round
 * lista, por membro, os índices/ids dos sets daquele `roundOrder`.
 */
export function buildRounds(
  members: readonly Pick<SupersetMember, 'exerciseIndex' | 'letter'>[],
  setsByMember: readonly ({ id: string; roundOrder: number }[] | undefined)[],
): { roundOrder: number; roundMembers: RoundMemberView[] }[] {
  const roundOrders = Array.from(
    new Set(setsByMember.flatMap((sets) => (sets ?? []).map((set) => set.roundOrder))),
  ).sort((a, b) => a - b);
  return roundOrders.map((roundOrder) => ({
    roundOrder,
    roundMembers: members
      .map((member, i) => {
        const sets = setsByMember[i] ?? [];
        const matched = sets
          .map((set, idx) => ({ set, idx }))
          .filter(({ set }) => set.roundOrder === roundOrder);
        if (matched.length === 0) return null;
        return {
          exerciseIndex: member.exerciseIndex,
          letter: member.letter,
          setIndexes: matched.map(({ idx }) => idx),
          ids: matched.map(({ set }) => set.id),
        } satisfies RoundMemberView;
      })
      .filter((value): value is RoundMemberView => value !== null),
  }));
}

export function toExecutionListItems(
  exercises: readonly MappableExercise[],
  type: WorkoutExerciseType,
  t: TFunction,
  language: string,
): ExecutionListItem[] {
  const filtered = exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(({ exercise }) => exercise.exerciseType === type);

  const groupOrder: string[] = [];
  const groups = new Map<string, { exercise: MappableExercise; exerciseIndex: number }[]>();
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
        aliasId: item.aliasId,
        letter: SUPERSET_LETTERS[i] ?? SUPERSET_LETTERS[SUPERSET_LETTERS.length - 1],
        name: item.name,
        variationName: item.variationName,
        note: item.note,
        restSeconds: item.restSeconds,
        alternative: item.alternative,
      };
    });
    items.push({
      kind: 'superset',
      id: groupId,
      members,
      restSeconds: members.reduce<number | null>(
        (max, member) =>
          member.restSeconds != null && member.restSeconds > (max ?? -1) ? member.restSeconds : max,
        null,
      ),
    });
  }
  return items;
}
