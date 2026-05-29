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
import { WorkoutExecutionActions } from '@/features/workouts/components/WorkoutExecutionActions';
import { WorkoutInfoBar } from '@/features/workouts/components/WorkoutInfoBar';
import {
  WorkoutNotesSheet,
  type WorkoutNotesSheetRef,
} from '@/features/workouts/components/WorkoutNotesSheet';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import {
  buildExecutionFromWorkout,
  type ExecutionExerciseInput,
  type ExecutionFormInput,
  ExecutionFormSchema,
  type ExecutionFormValues,
} from '@/features/workouts/lib/execution-form';
import { toExerciseExecutionItems } from '@/features/workouts/lib/workout-mappers';
import { type ActiveWorkout, activeWorkout$ } from '@/features/workouts/state/active-workout-store';

type ExecutionTab = 'preparatorio' | 'musculacao';

const DEFAULT_NEW_SET_REPS_MIN = 8;
const DEFAULT_NEW_SET_REPS_MAX = 12;

export default function WorkoutExecutionScreen() {
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

  useEffect(() => {
    if (!active && workoutTemplate) {
      // Deep-clone before seeding: legend-state v3 stores the passed object by
      // reference, so any later mutation under `activeWorkout$` would leak back
      // into the React Query cache.
      activeWorkout$.set({
        startedAt: new Date().toISOString(),
        athleteName: athleteName ?? null,
        note: null,
        workout_template: structuredClone(workoutTemplate),
        workout_execution: buildExecutionFromWorkout(workoutTemplate),
      });
    }
  }, [active, workoutTemplate, athleteName]);

  if (!active) {
    return <View className="flex-1 bg-background" />;
  }

  return <WorkoutExecutionContent active={active} />;
}

function WorkoutExecutionContent({ active }: { active: ActiveWorkout }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<ExecutionTab>('preparatorio');
  const notesSheetRef = useRef<WorkoutNotesSheetRef>(null);
  const kgLbsCalculatorSheetRef = useRef<KgLbsCalculatorSheetRef>(null);
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

  const { workout_template: workout } = active;
  const exercises = useValue(
    activeWorkout$.workout_execution.exercises,
  ) as ExecutionExerciseInput[];

  const warmupItems = useMemo(
    () => toExerciseExecutionItems(exercises, 'preparatorio', t, i18n.language),
    [exercises, t, i18n.language],
  );
  const strengthItems = useMemo(
    () => toExerciseExecutionItems(exercises, 'musculacao', t, i18n.language),
    [exercises, t, i18n.language],
  );

  const form = useForm<ExecutionFormInput, unknown, ExecutionFormValues>({
    resolver: zodResolver(ExecutionFormSchema),
    defaultValues: active.workout_execution,
    mode: 'onTouched',
  });

  const handleFinish = form.handleSubmit((_values) => {
    // TODO: persist the finished workout
  });

  useEffect(() => {
    const sub = form.watch((value) => {
      if (!value?.exercises) return;
      if (!activeWorkout$.peek()) return;
      activeWorkout$.workout_execution.set(value as ExecutionFormInput);
    });
    return () => sub.unsubscribe();
  }, [form]);

  const initialTabSetRef = useRef(false);
  useEffect(() => {
    if (initialTabSetRef.current) return;
    initialTabSetRef.current = true;
    if (warmupItems.length === 0) setTab('musculacao');
  }, [warmupItems.length]);

  const handleDeleteExercise = (exerciseIndex: number) => {
    const current = form.getValues('exercises') ?? [];
    const next = current
      .filter((_, i) => i !== exerciseIndex)
      .map((exercise, i) => ({ ...exercise, position: i }));
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
              <TabsTrigger value="preparatorio" className="flex-1">
                <Text>{t('workoutExecutionScreen.tabs.preparatorio')}</Text>
              </TabsTrigger>
              <TabsTrigger value="musculacao" className="flex-1">
                <Text>{t('workoutExecutionScreen.tabs.musculacao')}</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preparatorio" className="flex-1">
              <ExerciseExecutionList
                exercises={warmupItems}
                onAddExercise={handleAddExercise}
                onDeleteExercise={handleDeleteExercise}
              />
            </TabsContent>
            <TabsContent value="musculacao" className="flex-1">
              <ExerciseExecutionList
                exercises={strengthItems}
                onAddExercise={handleAddExercise}
                onDeleteExercise={handleDeleteExercise}
              />
            </TabsContent>
          </Tabs>
        </Animated.View>
        <WorkoutExecutionActions
          onFinish={handleFinish}
          onTimer={() => {}}
          onNotes={() => notesSheetRef.current?.present()}
          onAddExercise={handleAddExercise}
          onKgLbsCalculator={() => kgLbsCalculatorSheetRef.current?.present()}
        />
        <WorkoutNotesSheet ref={notesSheetRef} />
        <KgLbsCalculatorSheet ref={kgLbsCalculatorSheetRef} />
      </View>
    </FormProvider>
  );
}

function buildExecutionExerciseFromPicked(
  picked: PickedExercise,
  position: number,
): ExecutionExerciseInput {
  return {
    id: Crypto.randomUUID(),
    position,
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
        repsMin: DEFAULT_NEW_SET_REPS_MIN,
        repsMax: DEFAULT_NEW_SET_REPS_MAX,
        kg: '',
        reps: '',
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
