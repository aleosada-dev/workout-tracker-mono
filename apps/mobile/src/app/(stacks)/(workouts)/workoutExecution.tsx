import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useValue } from '@legendapp/state/react';
import {
  ConfirmDialog,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, useWindowDimensions, View } from 'react-native';
import {
  useReanimatedFocusedInput,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useExerciseLastSets } from '@/features/exercises/hooks/use-exercise-last-sets';
import { useExerciseRecords } from '@/features/exercises/hooks/use-exercise-records';
import { openExercisePicker } from '@/features/exercises/state/exercise-picker-bridge';
import { workoutObservability } from '@/features/observability/lib';
import { useOccurrenceWorkout } from '@/features/periodizations/hooks/use-occurrence-workout';
import { type IconAction, SelectionToolbar } from '@/features/shared/components/SelectionToolbar';
import { useElapsedSince } from '@/features/shared/hooks/use-elapsed-since';
import { impactLight, notifySuccess } from '@/features/shared/lib/haptics';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import {
  KgLbsCalculatorSheet,
  type KgLbsCalculatorSheetRef,
} from '@/features/workouts/components/KgLbsCalculatorSheet';
import {
  SupersetReorderSheet,
  type SupersetReorderSheetRef,
} from '@/features/workouts/components/SupersetReorderSheet';
import { TimerSheet, type TimerSheetRef } from '@/features/workouts/components/TimerSheet';
import { WorkoutExecutionActions } from '@/features/workouts/components/WorkoutExecutionActions';
import { WorkoutExecutionSkeleton } from '@/features/workouts/components/WorkoutExecutionSkeleton';
import { WorkoutInfoBar } from '@/features/workouts/components/WorkoutInfoBar';
import {
  WorkoutNotesSheet,
  type WorkoutNotesSheetRef,
} from '@/features/workouts/components/WorkoutNotesSheet';
import { useRestTimerController } from '@/features/workouts/hooks/use-rest-timer-controller';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import { useWorkoutLastLog } from '@/features/workouts/hooks/use-workout-last-log';
import { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import { buildCompletedExecution } from '@/features/workouts/lib/completed-execution';
import {
  buildExecutionExerciseFromPicked,
  buildExecutionFromWorkout,
  type ExecutionExerciseInput,
  type ExecutionFormInput,
  ExecutionFormSchema,
  type ExecutionFormValues,
  matchExecutionSetsByLogicalKey,
} from '@/features/workouts/lib/execution-form';
import {
  combineIntoSuperset,
  type ExecutionListItem,
  listIncompleteStrengthExercises,
  reorderExercisesWithinType,
  reorderSupersetMembers,
  toExecutionListItems,
  ungroupSuperset,
} from '@/features/workouts/lib/workout-mappers';
import { type ActiveWorkout, activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { restTimerBridge } from '@/features/workouts/state/rest-timer-bridge';

type ExecutionTab = 'preparatory' | 'strength';

export default function WorkoutExecutionScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const { workoutId, occurrenceId, userId, athleteName } = useLocalSearchParams<{
    workoutId?: string;
    occurrenceId?: string;
    userId?: string;
    athleteName?: string;
  }>();

  const occurrenceWorkout = useOccurrenceWorkout(
    active || !occurrenceId ? null : occurrenceId,
    userId,
  );

  const { data: baseWorkout } = useWorkout({
    workoutId: active || occurrenceId ? null : workoutId,
    userId: active ? null : userId,
  });

  const workoutTemplate = occurrenceId ? occurrenceWorkout.data?.workout : baseWorkout;
  const occurrenceNote = occurrenceId ? (occurrenceWorkout.data?.note ?? null) : null;

  const lastLog = useWorkoutLastLog({ workoutId: active ? null : workoutId });

  const variationIdsKey = useSelector(() => {
    const exercises = activeWorkout$.workoutExecution.exercises.get();
    if (exercises) return exercises.map((e) => e.variation.id).join(',');
    return (workoutTemplate?.exercises.map((e) => e.variation.id) ?? []).join(',');
  });
  const recordsVariationIds = useMemo(
    () => (variationIdsKey ? variationIdsKey.split(',') : []),
    [variationIdsKey],
  );
  const recordsUserId = (active?.workoutTemplate ?? workoutTemplate)?.userId;
  const records = useExerciseRecords(recordsVariationIds, recordsUserId);
  const lastSets = useExerciseLastSets(recordsVariationIds, recordsUserId);

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (active) {
      hasInitializedRef.current = true;
      return;
    }
    if (hasInitializedRef.current || !workoutTemplate) return;
    if (lastLog.isPending || lastSets.isLoading) return;
    hasInitializedRef.current = true;
    activeWorkout$.set({
      startedAt: new Date().toISOString(),
      athleteId: userId ?? null,
      athleteName: athleteName ?? null,
      occurrenceId: occurrenceId ?? null,
      occurrenceNote,
      note: null,
      workoutTemplate: structuredClone(workoutTemplate),
      workoutExecution: buildExecutionFromWorkout(workoutTemplate, lastSets.data ?? null),
      completedExecution: null,
      lastLog: lastLog.data ?? null,
      lastSets: lastSets.data ?? null,
      records: null,
    });
  }, [
    active,
    workoutTemplate,
    lastLog.isPending,
    lastLog.data,
    lastSets.isLoading,
    lastSets.data,
    athleteName,
    userId,
    occurrenceId,
    occurrenceNote,
  ]);

  useEffect(() => {
    if (!active || !records.data) return;
    activeWorkout$.records.set(records.data);
  }, [active, records.data]);

  useEffect(() => {
    if (!active || !lastSets.data) return;
    activeWorkout$.lastSets.set(lastSets.data);
  }, [active, lastSets.data]);

  if (!active) {
    return (
      <>
        <Stack.Screen
          options={{ title: workoutTemplate?.name ?? t('workoutExecutionScreen.loadingTitle') }}
        />
        <WorkoutExecutionSkeleton />
      </>
    );
  }

  return <WorkoutExecutionContent active={active} />;
}

function WorkoutExecutionContent({ active }: { active: ActiveWorkout }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<ExecutionTab>('preparatory');
  const notesSheetRef = useRef<WorkoutNotesSheetRef>(null);
  const kgLbsCalculatorSheetRef = useRef<KgLbsCalculatorSheetRef>(null);
  const timerSheetRef = useRef<TimerSheetRef>(null);
  const reorderSheetRef = useRef<SupersetReorderSheetRef>(null);
  const restTimer = useRestTimerController();
  const restTimerRef = useRef(restTimer);
  restTimerRef.current = restTimer;
  const { height: screenHeight } = useWindowDimensions();
  const { height: kbHeight } = useReanimatedKeyboardAnimation();
  const { input: focusedInput } = useReanimatedFocusedInput();

  const tabsAnimatedStyle = useAnimatedStyle(() => {
    const keyboardHeight = -kbHeight.value;
    const focused = focusedInput.value;
    if (keyboardHeight <= 0 || !focused) {
      return { transform: [{ translateY: withTiming(0, { duration: 150 }) }] };
    }
    const inputBottom = focused.layout.absoluteY + focused.layout.height;
    const keyboardTop = screenHeight - keyboardHeight;
    const overlap = Math.max(0, inputBottom - keyboardTop + 16);
    return { transform: [{ translateY: -overlap }] };
  });

  const { workoutTemplate: workout } = active;
  const exercises = useValue(activeWorkout$.workoutExecution.exercises) as ExecutionExerciseInput[];

  const warmupItems = useMemo(
    () => toExecutionListItems(exercises, 'preparatory', t, i18n.language),
    [exercises, t, i18n.language],
  );
  const strengthItems = useMemo(
    () => toExecutionListItems(exercises, 'strength', t, i18n.language),
    [exercises, t, i18n.language],
  );

  const items = tab === 'preparatory' ? warmupItems : strengthItems;
  const selection = useWorkoutSelection(items.map((item) => item.id));
  const selectionMode = selection.mode === 'select';

  const form = useForm<ExecutionFormInput, unknown, ExecutionFormValues>({
    resolver: zodResolver(ExecutionFormSchema),
    defaultValues: active.workoutExecution,
    mode: 'onTouched',
  });

  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [incompleteNames, setIncompleteNames] = useState<string[]>([]);
  const pendingValuesRef = useRef<ExecutionFormValues | null>(null);

  const goToSummary = (values: ExecutionFormValues) => {
    activeWorkout$.completedExecution.set(buildCompletedExecution(values));
    router.push('/(stacks)/(workouts)/workoutExecutionSummary');
  };

  const handleReview = form.handleSubmit((values) => {
    const incomplete = listIncompleteStrengthExercises(
      form.getValues('exercises'),
      t,
      i18n.language,
    );
    if (incomplete.length > 0) {
      pendingValuesRef.current = values;
      setIncompleteNames(incomplete);
      setIncompleteOpen(true);
      return;
    }
    goToSummary(values);
  });

  useEffect(() => {
    const sub = form.watch((value) => {
      if (!value?.exercises) return;
      if (!activeWorkout$.peek()) return;
      activeWorkout$.workoutExecution.set(value as ExecutionFormInput);
    });
    return () => sub.unsubscribe();
  }, [form]);

  // Preenche os placeholders (lastKg/lastReps) dos exercícios adicionados durante a
  // execução: ao adicionar um exercício, recordsVariationIds muda, useExerciseLastSets
  // refaz o fetch e activeWorkout$.lastSets atualiza — aqui aplicamos por slot lógico.
  // Idempotente (só escreve quando muda), então não toca nos do template já preenchidos.
  const lastSetsData = useValue(activeWorkout$.lastSets);
  useEffect(() => {
    if (!lastSetsData) return;
    const exercises = form.getValues('exercises') ?? [];
    exercises.forEach((exercise, exerciseIndex) => {
      const lastExercise = lastSetsData.find((e) => e.variationId === exercise.variation.id);
      matchExecutionSetsByLogicalKey(exercise.sets, lastExercise?.sets).forEach(
        (last, setIndex) => {
          const base = `exercises.${exerciseIndex}.sets.${setIndex}` as const;
          if (form.getValues(`${base}.lastKg`) !== last.lastKg) {
            form.setValue(`${base}.lastKg`, last.lastKg);
          }
          if (form.getValues(`${base}.lastReps`) !== last.lastReps) {
            form.setValue(`${base}.lastReps`, last.lastReps);
          }
        },
      );
    });
  }, [lastSetsData, form]);

  useEffect(
    () => restTimerBridge.register((seconds) => restTimerRef.current.requestStart(seconds)),
    [],
  );

  const initialTabSetRef = useRef(false);
  useEffect(() => {
    if (initialTabSetRef.current) return;
    initialTabSetRef.current = true;
    if (warmupItems.length === 0) setTab('strength');
  }, [warmupItems.length]);

  const handleDeleteExercises = (exerciseIndexes: number[]) => {
    const drop = new Set(exerciseIndexes);
    const current = form.getValues('exercises') ?? [];
    const next = current
      .filter((_, i) => !drop.has(i))
      .map((exercise, i) => ({ ...exercise, position: i }));
    form.setValue('exercises', next, { shouldDirty: true });
  };

  const handleReorder = (type: ExecutionTab, orderedItemIds: string[]) => {
    const current = form.getValues('exercises') ?? [];
    const next = reorderExercisesWithinType(current, type, orderedItemIds);
    form.setValue('exercises', next, { shouldDirty: true });
  };

  const handleAddExercise = () => {
    openExercisePicker({
      onPick: (picked) => {
        if (picked.length === 0) return;
        const currentFormExercises = form.getValues('exercises') ?? [];
        const startPosition = currentFormExercises.length;
        const additions = picked.map((p, i) =>
          buildExecutionExerciseFromPicked(p, startPosition + i, Crypto.randomUUID),
        );
        form.setValue('exercises', [...currentFormExercises, ...additions], {
          shouldDirty: true,
        });
      },
    });
  };

  const orderedSelectedItems = [...selection.selected]
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ExecutionListItem => item != null);
  const memberCount = (item: ExecutionListItem) =>
    item.kind === 'superset' ? item.members.length : 1;
  const totalMembers = orderedSelectedItems.reduce((sum, item) => sum + memberCount(item), 0);
  const supersetsSelected = orderedSelectedItems.filter((item) => item.kind === 'superset');
  const canCombine =
    orderedSelectedItems.length >= 2 &&
    totalMembers >= 2 &&
    totalMembers <= 3 &&
    supersetsSelected.length <= 1;
  const singleSupersetSelected =
    orderedSelectedItems.length === 1 && orderedSelectedItems[0]?.kind === 'superset';

  const itemExerciseIds = (item: ExecutionListItem, current: ExecutionExerciseInput[]) =>
    (item.kind === 'superset'
      ? item.members.map((m) => current[m.exerciseIndex]?.id)
      : [current[item.exerciseIndex]?.id]
    ).filter((id): id is string => id != null);

  const handleLongPressItem = (id: string) => {
    impactLight();
    selection.enterSelect(id);
  };

  const handleCombine = () => {
    const current = form.getValues('exercises') ?? [];
    const orderedIds = orderedSelectedItems.flatMap((item) => itemExerciseIds(item, current));
    if (orderedIds.length < 2 || orderedIds.length > 3) return;
    form.setValue('exercises', combineIntoSuperset(current, orderedIds, Crypto.randomUUID()), {
      shouldDirty: true,
    });
    notifySuccess();
    workoutObservability.trackAction('superset_created', { members: orderedIds.length });
    selection.exitSelect();
  };

  const handleUngroup = () => {
    const item = orderedSelectedItems[0];
    if (!item || item.kind !== 'superset') return;
    const current = form.getValues('exercises') ?? [];
    form.setValue('exercises', ungroupSuperset(current, item.id), { shouldDirty: true });
    workoutObservability.trackAction('superset_ungrouped');
    selection.exitSelect();
  };

  const handleOpenReorder = () => {
    const item = orderedSelectedItems[0];
    if (!item || item.kind !== 'superset') return;
    reorderSheetRef.current?.present(item.members, (orderedExerciseIndexes) => {
      const current = form.getValues('exercises') ?? [];
      const orderedIds = orderedExerciseIndexes
        .map((index) => current[index]?.id)
        .filter((id): id is string => id != null);
      form.setValue('exercises', reorderSupersetMembers(current, orderedIds), {
        shouldDirty: true,
      });
      workoutObservability.trackAction('superset_reordered');
      selection.exitSelect();
    });
  };

  const handleDeleteSelected = () => {
    const indexes = orderedSelectedItems.flatMap((item) =>
      item.kind === 'superset' ? item.members.map((m) => m.exerciseIndex) : [item.exerciseIndex],
    );
    handleDeleteExercises(indexes);
    selection.exitSelect();
  };

  const handleChangeTab = (value: ExecutionTab) => {
    selection.exitSelect();
    setTab(value);
  };

  const selectionActions: IconAction[] = singleSupersetSelected
    ? [
        {
          androidIcon: 'swap-vertical',
          iosIcon: 'arrow.up.arrow.down',
          label: t('workoutExecutionScreen.selection.reorder'),
          onPress: handleOpenReorder,
        },
        {
          androidIcon: 'unlink',
          iosIcon: 'scissors',
          label: t('workoutExecutionScreen.selection.ungroup'),
          onPress: handleUngroup,
        },
        {
          androidIcon: 'trash-outline',
          iosIcon: 'trash',
          label: t('workoutExecutionScreen.selection.delete'),
          onPress: handleDeleteSelected,
          destructive: true,
        },
      ]
    : [
        {
          androidIcon: 'link',
          iosIcon: 'link',
          label: t('workoutExecutionScreen.selection.combine'),
          onPress: handleCombine,
          disabled: !canCombine,
        },
        {
          androidIcon: 'trash-outline',
          iosIcon: 'trash',
          label: t('workoutExecutionScreen.selection.delete'),
          onPress: handleDeleteSelected,
          destructive: true,
        },
      ];

  return (
    <FormProvider {...form}>
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: workout.name,
            headerLeft: undefined,
            headerRight:
              Platform.OS === 'ios'
                ? undefined
                : () => <ElapsedTimeDisplay startedAt={active.startedAt} className="pr-2" />,
            unstable_headerRightItems:
              Platform.OS === 'ios'
                ? () => [
                    {
                      type: 'custom',
                      element: <ElapsedTimeDisplay startedAt={active.startedAt} className="pr-2" />,
                      hidesSharedBackground: true,
                    },
                  ]
                : undefined,
          }}
        />
        <WorkoutInfoBar note={active.occurrenceNote} description={workout.description} />
        <Animated.View style={[{ flex: 1 }, tabsAnimatedStyle]}>
          <Tabs
            value={tab}
            onValueChange={(value) => handleChangeTab(value as ExecutionTab)}
            className="flex-1 px-4"
          >
            <TabsList variant="outline" className="w-full">
              <TabsTrigger value="preparatory" className="flex-1">
                <Text>{t('workoutExecutionScreen.tabs.preparatory')}</Text>
              </TabsTrigger>
              <TabsTrigger value="strength" className="flex-1">
                <Text>{t('workoutExecutionScreen.tabs.strength')}</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preparatory" className="flex-1">
              <ExerciseExecutionList
                exercises={warmupItems}
                onAddExercise={handleAddExercise}
                onDeleteExercises={handleDeleteExercises}
                onReorder={(ids) => handleReorder('preparatory', ids)}
                selectionMode={selectionMode && tab === 'preparatory'}
                selectedIds={selection.selected}
                onToggleSelect={selection.toggle}
                onLongPressItem={handleLongPressItem}
              />
            </TabsContent>
            <TabsContent value="strength" className="flex-1">
              <ExerciseExecutionList
                exercises={strengthItems}
                onAddExercise={handleAddExercise}
                onDeleteExercises={handleDeleteExercises}
                onReorder={(ids) => handleReorder('strength', ids)}
                selectionMode={selectionMode && tab === 'strength'}
                selectedIds={selection.selected}
                onToggleSelect={selection.toggle}
                onLongPressItem={handleLongPressItem}
              />
            </TabsContent>
          </Tabs>
        </Animated.View>
        {selectionMode ? (
          <SelectionToolbar
            count={selection.selected.size}
            onCancel={selection.exitSelect}
            allSelected={selection.allSelected}
            onToggleSelectAll={selection.toggleSelectAll}
            actions={selectionActions}
          />
        ) : (
          <WorkoutExecutionActions
            onReview={handleReview}
            onTimer={() => timerSheetRef.current?.present()}
            onNotes={() => notesSheetRef.current?.present()}
            onAddExercise={handleAddExercise}
            onKgLbsCalculator={() => kgLbsCalculatorSheetRef.current?.present()}
            timer={{
              active: restTimer.isActive,
              label: restTimer.label,
              isPaused: restTimer.isPaused,
              onPauseResume: () => (restTimer.isPaused ? restTimer.resume() : restTimer.pause()),
              onStop: restTimer.stop,
              onOpen: () => timerSheetRef.current?.present(),
            }}
          />
        )}
        <WorkoutNotesSheet ref={notesSheetRef} />
        <KgLbsCalculatorSheet ref={kgLbsCalculatorSheetRef} />
        <TimerSheet ref={timerSheetRef} controller={restTimer} />
        <SupersetReorderSheet ref={reorderSheetRef} />
        <ConfirmDialog
          open={incompleteOpen}
          onOpenChange={setIncompleteOpen}
          title={t('workoutExecutionScreen.incompleteSets.title')}
          titleClassName="text-center"
          description={`${t('workoutExecutionScreen.incompleteSets.description')}\n\n${incompleteNames
            .map((name) => `• ${name}`)
            .join('\n')}`}
          descriptionClassName="text-left"
          confirmLabel={t('workoutExecutionScreen.incompleteSets.goBack')}
          cancelLabel={t('workoutExecutionScreen.incompleteSets.continueToReview')}
          destructive={false}
          onConfirm={() => {
            pendingValuesRef.current = null;
          }}
          onCancel={() => {
            const values = pendingValuesRef.current;
            pendingValuesRef.current = null;
            if (values) goToSummary(values);
          }}
        />
      </View>
    </FormProvider>
  );
}

function ElapsedTimeDisplay({ startedAt, className }: { startedAt: string; className?: string }) {
  const elapsed = useElapsedSince(startedAt);
  if (!elapsed) return null;
  const hh = String(elapsed.hours).padStart(2, '0');
  const mm = String(elapsed.minutes).padStart(2, '0');
  return (
    <View className={`flex-row items-center gap-1.5 ${className ?? ''}`}>
      <Icon as={Clock} size={16} className="text-foreground" />
      <Text className="font-mono text-foreground text-sm">{`${hh}:${mm}`}</Text>
    </View>
  );
}
