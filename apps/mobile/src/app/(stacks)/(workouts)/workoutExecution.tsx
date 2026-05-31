import { zodResolver } from '@hookform/resolvers/zod';
import { useValue } from '@legendapp/state/react';
import {
  Alert,
  AlertDescription,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Clock, StickyNote } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, useWindowDimensions, View } from 'react-native';
import {
  useReanimatedFocusedInput,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import {
  openExercisePicker,
  type PickedExercise,
} from '@/features/exercises/state/exercise-picker-bridge';
import { useElapsedSince } from '@/features/shared/hooks/use-elapsed-since';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import {
  KgLbsCalculatorSheet,
  type KgLbsCalculatorSheetRef,
} from '@/features/workouts/components/KgLbsCalculatorSheet';
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
import {
  buildExecutionFromWorkout,
  type ExecutionExerciseInput,
  type ExecutionFormInput,
  ExecutionFormSchema,
  type ExecutionFormValues,
} from '@/features/workouts/lib/execution-form';
import {
  reorderExercisesWithinType,
  toExecutionListItems,
} from '@/features/workouts/lib/workout-mappers';
import { type ActiveWorkout, activeWorkout$ } from '@/features/workouts/state/active-workout-store';
import { restTimerBridge } from '@/features/workouts/state/rest-timer-bridge';

type ExecutionTab = 'preparatory' | 'strength';

const DEFAULT_NEW_SET_REPS_MIN = 8;
const DEFAULT_NEW_SET_REPS_MAX = 12;

export default function WorkoutExecutionScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const { workoutId, userId, athleteName } = useLocalSearchParams<{
    workoutId?: string;
    userId?: string;
    athleteName?: string;
  }>();

  const { data: workoutTemplate } = useWorkout({
    workoutId: active ? null : workoutId,
    userId: active ? null : userId,
  });

  const lastLog = useWorkoutLastLog({ workoutId: active ? null : workoutId });

  useEffect(() => {
    if (active || !workoutTemplate) return;
    if (lastLog.isPending) return;
    activeWorkout$.set({
      startedAt: new Date().toISOString(),
      athleteName: athleteName ?? null,
      note: null,
      workoutTemplate: structuredClone(workoutTemplate),
      workoutExecution: buildExecutionFromWorkout(workoutTemplate, lastLog.data ?? null),
      lastLog: lastLog.data ?? null,
    });
  }, [active, workoutTemplate, lastLog.isPending, lastLog.data, athleteName]);

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

  const form = useForm<ExecutionFormInput, unknown, ExecutionFormValues>({
    resolver: zodResolver(ExecutionFormSchema),
    defaultValues: active.workoutExecution,
    mode: 'onTouched',
  });

  const handleFinish = form.handleSubmit((_values) => {
    // TODO: persist the finished workout
  });

  useEffect(() => {
    const sub = form.watch((value) => {
      if (!value?.exercises) return;
      if (!activeWorkout$.peek()) return;
      activeWorkout$.workoutExecution.set(value as ExecutionFormInput);
    });
    return () => sub.unsubscribe();
  }, [form]);

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
          buildExecutionExerciseFromPicked(p, startPosition + i),
        );
        form.setValue('exercises', [...currentFormExercises, ...additions], {
          shouldDirty: true,
        });
      },
    });
  };

  return (
    <FormProvider {...form}>
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: workout.name,
            headerRight:
              Platform.OS === 'ios'
                ? undefined
                : () => <ElapsedTimeDisplay startedAt={active.startedAt} className="pr-2" />,
          }}
        />
        {Platform.OS === 'ios' ? (
          <WorkoutInfoBar startedAt={active.startedAt} description={workout.description} />
        ) : workout.description ? (
          <View className="px-4 pt-4 pb-6">
            <Alert icon={StickyNote}>
              <AlertDescription>{workout.description}</AlertDescription>
            </Alert>
          </View>
        ) : null}
        <Animated.View style={[{ flex: 1 }, tabsAnimatedStyle]}>
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as ExecutionTab)}
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
              />
            </TabsContent>
            <TabsContent value="strength" className="flex-1">
              <ExerciseExecutionList
                exercises={strengthItems}
                onAddExercise={handleAddExercise}
                onDeleteExercises={handleDeleteExercises}
                onReorder={(ids) => handleReorder('strength', ids)}
              />
            </TabsContent>
          </Tabs>
        </Animated.View>
        <WorkoutExecutionActions
          onFinish={handleFinish}
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
        <WorkoutNotesSheet ref={notesSheetRef} />
        <KgLbsCalculatorSheet ref={kgLbsCalculatorSheetRef} />
        <TimerSheet ref={timerSheetRef} controller={restTimer} />
      </View>
    </FormProvider>
  );
}

function buildExecutionExerciseFromPicked(
  picked: PickedExercise,
  position: number,
): ExecutionExerciseInput {
  const id = Crypto.randomUUID();
  return {
    id,
    exerciseType: picked.exercise.type === 'preparatorio' ? 'preparatory' : 'strength',
    position,
    supersetGroupId: id,
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: picked.variation.id,
      slug: picked.variation.slug,
      name: picked.variation.name,
      exercise: {
        slug: picked.exercise.slug,
        name: picked.exercise.name,
        type: picked.exercise.type,
      },
      equipment: {
        slug: picked.variation.equipment.slug,
        preposition: picked.variation.equipment.preposition,
      },
      muscle: { slug: picked.variation.muscle.slug },
      secondaryMuscle: picked.variation.secondaryMuscle
        ? { slug: picked.variation.secondaryMuscle.slug }
        : null,
    },
    sets: [
      {
        id: Crypto.randomUUID(),
        type: 'normal',
        measurementType: 'weight_reps',
        repsMin: DEFAULT_NEW_SET_REPS_MIN,
        repsMax: DEFAULT_NEW_SET_REPS_MAX,
        durationTarget: null,
        kg: '',
        reps: '',
        duration: '',
        done: false,
      },
    ],
  };
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
