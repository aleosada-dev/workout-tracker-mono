import {
  assignLogicalKeys,
  deriveRoundOrders,
  EXERCISE_MEASUREMENT_TYPES,
  EXERCISE_TYPES,
  type ExerciseMeasurementType,
  MAX_DISTANCE_METERS,
  MAX_DURATION_SECONDS,
  MAX_REPS,
  MEASUREMENT_TYPES,
  type MeasurementType,
  MIN_REPS,
  matchSets,
  measurementDimensions,
  type SetLike,
  WORKOUT_EXERCISE_TYPES,
  WORKOUT_SET_TYPES,
  type WorkoutExerciseType,
} from '@workout-tracker/domain';
import { z } from 'zod';
import type { ExerciseLastSetsResponse } from '@/features/exercises/api/exercises';
import type { PickedExercise } from '@/features/exercises/state/exercise-picker-bridge';
import {
  countFractionDigits,
  parseLocalizedNumber,
} from '@/features/shared/lib/utils/numeric-input';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';

const MAX_WEIGHT_KG = 1000;
const MAX_WEIGHT_FRACTION_DIGITS = 2;

const optionalWeightField = z
  .string()
  .refine((v) => v === '' || countFractionDigits(v) <= MAX_WEIGHT_FRACTION_DIGITS, {
    message: 'weight.tooManyDecimals',
  })
  .transform((v) => (v === '' ? undefined : parseLocalizedNumber(v)))
  .pipe(z.number().positive().lt(MAX_WEIGHT_KG).optional());

const optionalRepsField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(MIN_REPS).max(MAX_REPS).optional());

const optionalDurationField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(1).max(MAX_DURATION_SECONDS).optional());

const optionalDistanceField = z
  .string()
  .transform((v) => (v === '' ? undefined : Number(v)))
  .pipe(z.number().int().min(1).max(MAX_DISTANCE_METERS).optional());

export const ExecutionSetSchema = z
  .object({
    id: z.string(),
    type: z.enum(WORKOUT_SET_TYPES),
    measurementType: z.enum(MEASUREMENT_TYPES),
    roundOrder: z.int().nonnegative(),
    repsMin: z.int().positive().nullable(),
    repsMax: z.int().positive().nullable(),
    durationTarget: z.int().positive().nullable(),
    distanceTarget: z.int().positive().nullable(),
    kg: optionalWeightField,
    reps: optionalRepsField,
    duration: optionalDurationField,
    distance: optionalDistanceField,
    done: z.boolean(),
    lastKg: z.number().nonnegative().nullable().optional(),
    lastReps: z.int().positive().nullable().optional(),
    lastDuration: z.int().positive().nullable().optional(),
    lastDistance: z.int().positive().nullable().optional(),
    linkedSetId: z.string().nullable().optional(),
    loadPercent: z.int().nonnegative().nullable().optional(),
    loadPercentOfPrevious: z.int().nonnegative().nullable().optional(),
  })
  .superRefine((set, ctx) => {
    if (!set.done) return;
    const dims = measurementDimensions(set.measurementType);
    if (dims.weight && set.kg === undefined) {
      ctx.addIssue({ code: 'custom', path: ['kg'], message: 'weight.required' });
    }
    if (dims.reps && set.reps === undefined) {
      ctx.addIssue({ code: 'custom', path: ['reps'], message: 'reps.required' });
    }
    if (dims.duration && set.duration === undefined) {
      ctx.addIssue({ code: 'custom', path: ['duration'], message: 'duration.required' });
    }
    if (dims.distance && set.distance === undefined) {
      ctx.addIssue({ code: 'custom', path: ['distance'], message: 'distance.required' });
    }
  });

export const ExecutionExerciseVariationSchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  name: z.string().nullable(),
  exercise: z.object({
    slug: z.string().nullable(),
    name: z.string(),
    type: z.enum(EXERCISE_TYPES),
  }),
  measurementType: z.enum(EXERCISE_MEASUREMENT_TYPES),
  equipment: z.object({
    slug: z.string(),
    preposition: z.string(),
  }),
  muscle: z.object({ slug: z.string() }),
  secondaryMuscle: z.object({ slug: z.string() }).nullable(),
});

// Exercício alternativo: substitui o principal na execução. Tem sua própria
// variação e seus próprios sets (estado de execução separado do principal, para
// preservar o que foi digitado ao alternar).
export const ExecutionAlternativeSchema = z.object({
  id: z.string(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  aliasId: z.string().nullable(),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(ExecutionSetSchema),
});

export const ExecutionExerciseSchema = z.object({
  id: z.string(),
  exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
  position: z.int().nonnegative(),
  supersetGroupId: z.string(),
  supersetOrder: z.int().nonnegative(),
  note: z.string().nullable(),
  restSeconds: z.int().nonnegative().nullable(),
  // Máquina (alias) selecionada para este exercício; null = sem máquina.
  aliasId: z.string().nullable(),
  // true = executar o alternativo no lugar do principal (escopo da sessão).
  usingAlternative: z.boolean().default(false),
  variation: ExecutionExerciseVariationSchema,
  sets: z.array(ExecutionSetSchema),
  alternative: ExecutionAlternativeSchema.nullable().default(null),
});

export const ExecutionFormSchema = z.object({
  exercises: z.array(ExecutionExerciseSchema),
});

export type ExecutionFormInput = z.input<typeof ExecutionFormSchema>;
export type ExecutionFormValues = z.output<typeof ExecutionFormSchema>;
export type ExecutionExerciseInput = ExecutionFormInput['exercises'][number];
export type ExecutionSetInput = ExecutionExerciseInput['sets'][number];
export type ExecutionExerciseVariation = z.infer<typeof ExecutionExerciseVariationSchema>;

type LastSetsExerciseItem = ExerciseLastSetsResponse[number];
type LastSetsExerciseSets = LastSetsExerciseItem['buckets'][number]['sets'];
type TemplateExerciseSets = GetWorkoutResponse['exercises'][number]['sets'];

/**
 * Resolve o bucket de última-carga para uma variation, dado o alias selecionado.
 * - alias específico com histórico → usa esse bucket.
 * - null ("sem máquina") → mescla todos os buckets pegando o set mais recente por
 *   slot lógico, espelhando o "tudo junto" da tela de detalhes (histórico de
 *   todas as sessões, qualquer alias).
 * - sem casar (alias novo) → cai para o log mais recente geral: último alias
 *   usado → bucket "sem alias" → primeiro bucket.
 * `selectedAliasId` undefined = sem seleção; null = seleção explícita de "sem máquina".
 */
export function resolveLastBucketSets(
  item: LastSetsExerciseItem | undefined,
  selectedAliasId?: string | null,
): LastSetsExerciseSets | undefined {
  if (!item || item.buckets.length === 0) return undefined;
  if (selectedAliasId === null) return mergeMostRecentByLogicalKey(item.buckets);
  const exact = item.buckets.find((bucket) => bucket.aliasId === selectedAliasId);
  if (exact && exact.sets.length > 0) return exact.sets;
  const byLastUsed = item.buckets.find((bucket) => bucket.aliasId === item.lastUsedAliasId);
  const byNoAlias = item.buckets.find((bucket) => bucket.aliasId === null);
  return (byLastUsed ?? byNoAlias ?? item.buckets[0]).sets;
}

/**
 * Achata os buckets num único conjunto, mantendo, por logical key, o set com o
 * `finishedAt` mais recente. A ordem da resposta da API não é garantida, então
 * comparamos explicitamente em vez de confiar num "último a chegar".
 */
function mergeMostRecentByLogicalKey(
  buckets: LastSetsExerciseItem['buckets'],
): LastSetsExerciseSets {
  const best = new Map<string, LastSetsExerciseSets[number]>();
  for (const bucket of buckets) {
    for (const set of bucket.sets) {
      const current = best.get(set.logicalKey);
      if (!current || set.finishedAt > current.finishedAt) best.set(set.logicalKey, set);
    }
  }
  return Array.from(best.values());
}

type LastValues = {
  lastKg: number | null;
  lastReps: number | null;
  lastDuration: number | null;
  lastDistance: number | null;
};
type TargetValues = {
  repsMin: number | null;
  repsMax: number | null;
  durationTarget: number | null;
  distanceTarget: number | null;
};

export function matchExecutionSets<R extends SetLike>(
  sets: ExecutionSetInput[],
  reference: R[] | undefined,
): Array<R | null> {
  if (!reference || reference.length === 0) {
    return sets.map(() => null);
  }
  const keyed = sets.map((set, index) => ({ setType: set.type, setOrder: index, id: set.id }));
  const byId = new Map<string, R>();
  for (const match of matchSets(keyed, reference)) {
    if (match.a && match.b) {
      byId.set(match.a.id, match.b);
    }
  }
  return sets.map((set) => byId.get(set.id) ?? null);
}

/**
 * Casa os sets da execução com o último set por slot lógico (vindo de /exercises/last).
 * A referência já traz a `logicalKey`; aqui só computamos a logical key dos sets atuais
 * (mesma `assignLogicalKeys` do domínio) e fazemos lookup direto.
 */
export function matchExecutionSetsByLogicalKey(
  sets: ExecutionSetInput[],
  reference: LastSetsExerciseSets | undefined,
): LastValues[] {
  if (!reference || reference.length === 0) {
    return sets.map(() => ({
      lastKg: null,
      lastReps: null,
      lastDuration: null,
      lastDistance: null,
    }));
  }
  const keyed = assignLogicalKeys(
    sets.map((set, index) => ({ setType: set.type, setOrder: index })),
  );
  const byKey = new Map(reference.map((ref) => [ref.logicalKey, ref]));
  return keyed.map((k) => {
    const ref = byKey.get(k.logicalKey);
    return {
      lastKg: ref?.weightKg ?? null,
      lastReps: ref?.reps ?? null,
      lastDuration: ref?.durationSeconds ?? null,
      lastDistance: ref?.distanceMeters ?? null,
    };
  });
}

export function matchExecutionSetsToTemplate(
  sets: ExecutionSetInput[],
  templateSets: TemplateExerciseSets | undefined,
): TargetValues[] {
  return matchExecutionSets(sets, templateSets).map((template) => ({
    repsMin: template?.repsMin ?? null,
    repsMax: template?.repsMax ?? null,
    durationTarget: template?.durationSeconds ?? null,
    distanceTarget: template?.distanceMeters ?? null,
  }));
}

export function autofillFromLast(current: string, last: number | null | undefined): string | null {
  if (current.length > 0) {
    return null;
  }
  if (last == null) {
    return null;
  }
  return String(last);
}

export function restTimerDuration(restSeconds: number | null | undefined): number | null {
  if (restSeconds == null || restSeconds <= 0) {
    return null;
  }
  return restSeconds;
}

/**
 * Mapeia a measurement_type (4 valores) da variação para o vocabulário de set.
 */
export function setMeasurementTypeForVariation(
  measurementType: ExerciseMeasurementType,
): MeasurementType {
  switch (measurementType) {
    case 'reps':
      return 'reps';
    case 'duration':
      return 'duration';
    case 'distance':
      return 'distance';
    default:
      return 'weight_reps';
  }
}

export function buildExecutionExerciseFromPicked(
  picked: PickedExercise,
  position: number,
  generateId: () => string,
  /** Seção (aba) ativa no momento do clique em adicionar; define onde o exercício entra. */
  exerciseType: WorkoutExerciseType,
  setsCount = 1,
): ExecutionExerciseInput {
  const id = generateId();
  const measurementType = setMeasurementTypeForVariation(picked.variation.measurementType);
  return {
    id,
    exerciseType,
    position,
    supersetGroupId: id,
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    aliasId: null,
    variation: {
      id: picked.variation.id,
      slug: picked.variation.slug,
      name: picked.variation.name,
      exercise: {
        slug: picked.exercise.slug,
        name: picked.exercise.name,
        type: picked.exercise.type,
      },
      measurementType: picked.variation.measurementType,
      equipment: {
        slug: picked.variation.equipment.slug,
        preposition: picked.variation.equipment.preposition,
      },
      muscle: { slug: picked.variation.muscle.slug },
      secondaryMuscle: picked.variation.secondaryMuscle
        ? { slug: picked.variation.secondaryMuscle.slug }
        : null,
    },
    sets: Array.from({ length: Math.max(1, setsCount) }, (_, i) => ({
      id: generateId(),
      type: 'normal',
      measurementType,
      roundOrder: i,
      repsMin: null,
      repsMax: null,
      durationTarget: null,
      distanceTarget: null,
      kg: '',
      reps: '',
      duration: '',
      distance: '',
      done: false,
      linkedSetId: null,
      loadPercent: null,
      loadPercentOfPrevious: null,
    })),
  };
}

type ResponseExercise = GetWorkoutResponse['exercises'][number];

/**
 * Constrói os sets de execução (com targets, alias pré-selecionado e última-carga
 * casada por slot lógico) para uma linha de exercício — principal OU alternativo.
 * O alias e o `lastSets` são resolvidos pela variation **daquela** linha.
 */
function buildExecutionExercisePart(
  exercise: ResponseExercise,
  lastSets: ExerciseLastSetsResponse | null,
  validAliasIds: Set<string> | null,
): { aliasId: string | null; sets: ExecutionSetInput[] } {
  const lastExercise = lastSets?.find((e) => e.variationId === exercise.variation.id);
  const fallbackRounds = deriveRoundOrders(
    exercise.sets.map((set) => ({ type: set.setType ?? 'normal' })),
  );
  const setMeasurementType = setMeasurementTypeForVariation(exercise.variation.measurementType);
  const sets: ExecutionSetInput[] = exercise.sets.map((set, i) => ({
    id: set.id,
    type: set.setType ?? 'normal',
    measurementType: setMeasurementType,
    roundOrder: set.roundOrder ?? fallbackRounds[i],
    repsMin: set.repsMin,
    repsMax: set.repsMax,
    durationTarget: set.durationSeconds ?? null,
    distanceTarget: set.distanceMeters ?? null,
    kg: '',
    reps: '',
    duration: '',
    distance: '',
    done: false,
    lastKg: null,
    lastReps: null,
    lastDuration: null,
    lastDistance: null,
    linkedSetId: set.linkedSetId,
    loadPercent: set.loadPercent,
    loadPercentOfPrevious: set.loadPercentOfPrevious,
  }));
  // Pré-seleciona o último alias usado naquela variation (fallback: sem máquina).
  // Ignora um alias que não está mais na lista ativa (ex.: excluído).
  const lastUsedAliasId = lastExercise?.lastUsedAliasId ?? null;
  const aliasId =
    lastUsedAliasId != null && (validAliasIds === null || validAliasIds.has(lastUsedAliasId))
      ? lastUsedAliasId
      : null;
  const matched = matchExecutionSetsByLogicalKey(
    sets,
    resolveLastBucketSets(lastExercise, aliasId),
  );
  return { aliasId, sets: sets.map((set, i) => ({ ...set, ...matched[i] })) };
}

export function buildExecutionFromWorkout(
  workout: GetWorkoutResponse,
  lastSets: ExerciseLastSetsResponse | null = null,
  /**
   * Personalizações ativas (já filtradas por deleted_at). Quando fornecidas, o
   * alias pré-selecionado (`lastUsedAliasId`, vindo dos logs e que NÃO filtra
   * alias excluído) é reconciliado contra elas: se a última usada foi excluída,
   * cai para "sem personalização" — evita semear um alias morto (carga escopada
   * errada e save rejeitado pelo insert). `null` = não reconciliar.
   */
  aliases: readonly { id: string }[] | null = null,
): ExecutionFormInput {
  const validAliasIds = aliases ? new Set(aliases.map((a) => a.id)) : null;
  const altByPrincipal = new Map(
    workout.exercises
      .filter((exercise) => exercise.alternativeOfId != null)
      .map((exercise) => [exercise.alternativeOfId as string, exercise]),
  );
  return {
    exercises: workout.exercises
      .filter((exercise) => exercise.alternativeOfId == null)
      .map((exercise) => {
        const principal = buildExecutionExercisePart(exercise, lastSets, validAliasIds);
        const altExercise = altByPrincipal.get(exercise.id) ?? null;
        const altPart = altExercise
          ? buildExecutionExercisePart(altExercise, lastSets, validAliasIds)
          : null;
        return {
          id: exercise.id,
          exerciseType: exercise.exerciseType,
          position: exercise.position,
          supersetGroupId: exercise.supersetGroupId,
          supersetOrder: exercise.supersetOrder,
          note: exercise.note,
          restSeconds: exercise.restSeconds,
          aliasId: principal.aliasId,
          usingAlternative: false,
          variation: exercise.variation,
          sets: principal.sets,
          alternative:
            altExercise && altPart
              ? {
                  id: altExercise.id,
                  note: altExercise.note,
                  restSeconds: altExercise.restSeconds,
                  aliasId: altPart.aliasId,
                  variation: altExercise.variation,
                  sets: altPart.sets,
                }
              : null,
        };
      }),
  };
}
