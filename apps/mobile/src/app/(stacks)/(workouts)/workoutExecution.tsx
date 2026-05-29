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
import { Stack, useLocalSearchParams } from 'expo-router';
import { Clock, StickyNote } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { useElapsedSince } from '@/features/shared/hooks/use-elapsed-since';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import { WorkoutExecutionActions } from '@/features/workouts/components/WorkoutExecutionActions';
import { WorkoutInfoBar } from '@/features/workouts/components/WorkoutInfoBar';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import {
  buildExecutionFromWorkout,
  type ExecutionFormInput,
  ExecutionFormSchema,
  type ExecutionFormValues,
} from '@/features/workouts/lib/execution-form';
import { toExerciseExecutionItems } from '@/features/workouts/lib/workout-mappers';
import { type ActiveWorkout, activeWorkout$ } from '@/features/workouts/state/active-workout-store';

type ExecutionTab = 'preparatorio' | 'musculacao';

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
      activeWorkout$.set({
        startedAt: new Date().toISOString(),
        athleteName: athleteName ?? null,
        workout_template: workoutTemplate,
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

  const { workout_template: workout } = active;

  const preparatorioItems = useMemo(
    () => toExerciseExecutionItems(workout, 'preparatorio', t, i18n.language),
    [workout, t, i18n.language],
  );
  const musculacaoItems = useMemo(
    () => toExerciseExecutionItems(workout, 'musculacao', t, i18n.language),
    [workout, t, i18n.language],
  );

  const form = useForm<ExecutionFormInput, unknown, ExecutionFormValues>({
    resolver: zodResolver(ExecutionFormSchema),
    // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot defaults once on mount; updates come through the form, not the observable
    defaultValues: useMemo(() => active.workout_execution, []),
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
    if (preparatorioItems.length === 0) setTab('musculacao');
  }, [preparatorioItems.length]);

  const handleAddExercise = () => {};

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
              exercises={preparatorioItems}
              onAddExercise={handleAddExercise}
            />
          </TabsContent>
          <TabsContent value="musculacao" className="flex-1">
            <ExerciseExecutionList exercises={musculacaoItems} onAddExercise={handleAddExercise} />
          </TabsContent>
        </Tabs>
        <WorkoutExecutionActions
          onFinish={handleFinish}
          onTimer={() => {}}
          onNotes={() => {}}
          onAddExercise={handleAddExercise}
          onKgLbsCalculator={() => {}}
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
