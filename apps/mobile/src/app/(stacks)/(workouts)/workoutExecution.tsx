import { useValue } from '@legendapp/state/react';
import {
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StickyNote } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import { WorkoutExecutionActions } from '@/features/workouts/components/WorkoutExecutionActions';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

type ExecutionTab = 'preparatorio' | 'musculacao';

export default function WorkoutExecutionScreen() {
  const { t } = useTranslation();
  const active = useValue(activeWorkout$);
  const [tab, setTab] = useState<ExecutionTab>('preparatorio');
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
        workout: workoutTemplate,
      });
    }
  }, [active, workoutTemplate, athleteName]);

  const workout = active?.workout ?? workoutTemplate;

  const handleAddExercise = () => {};

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: workout?.name ?? '' }} />
      {workout?.description ? (
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
          <ExerciseExecutionList onAddExercise={handleAddExercise} />
        </TabsContent>
        <TabsContent value="musculacao" className="flex-1">
          <ExerciseExecutionList onAddExercise={handleAddExercise} />
        </TabsContent>
      </Tabs>
      <WorkoutExecutionActions
        onFinish={() => {}}
        onTimer={() => {}}
        onNotes={() => {}}
        onAddExercise={handleAddExercise}
        onKgLbsCalculator={() => {}}
      />
    </View>
  );
}
