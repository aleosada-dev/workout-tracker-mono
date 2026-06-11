import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConfirmDialog,
  Field,
  Input,
  RequestErrorState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import * as Crypto from 'expo-crypto';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { openExercisePicker } from '@/features/exercises/state/exercise-picker-bridge';
import { workoutObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { SelectionToolbar } from '@/features/shared/components/SelectionToolbar';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import { ExerciseBuilderCard } from '@/features/workouts/components/ExerciseBuilderCard';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import { SupersetBuilderCard } from '@/features/workouts/components/SupersetBuilderCard';
import {
  SupersetReorderSheet,
  type SupersetReorderSheetRef,
} from '@/features/workouts/components/SupersetReorderSheet';
import { WorkoutBuilderActions } from '@/features/workouts/components/WorkoutBuilderActions';
import { WorkoutExecutionSkeleton } from '@/features/workouts/components/WorkoutExecutionSkeleton';
import { useExerciseListEditing } from '@/features/workouts/hooks/use-exercise-list-editing';
import { useUpsertWorkout } from '@/features/workouts/hooks/use-upsert-workout';
import { useWorkout } from '@/features/workouts/hooks/use-workout';
import { useWorkoutSelection } from '@/features/workouts/hooks/use-workout-selection';
import {
  buildBuilderExerciseFromPicked,
  buildBuilderFromWorkout,
  toUpsertWorkoutRequest,
  type WorkoutFormInput,
  WorkoutFormSchema,
  type WorkoutFormValues,
} from '@/features/workouts/lib/builder-form';
import { toExecutionListItems } from '@/features/workouts/lib/workout-mappers';

type BuilderTab = 'preparatory' | 'strength';

/**
 * Tela de criação e edição de treino (template). Sem `workoutId` na rota é
 * criação; com `workoutId` carrega o treino e entra em modo edição.
 */
export default function WorkoutFormScreen() {
  const { t } = useTranslation();
  const { workoutId, userId, folderId } = useLocalSearchParams<{
    workoutId?: string;
    userId?: string;
    folderId?: string;
  }>();
  const editQuery = useWorkout({ workoutId: workoutId ?? null, userId: userId ?? null });

  if (workoutId) {
    if (editQuery.isPending) {
      return (
        <>
          <Stack.Screen options={{ title: t('workoutFormScreen.editTitle') }} />
          <WorkoutExecutionSkeleton />
        </>
      );
    }
    if (editQuery.isError || !editQuery.data) {
      return (
        <>
          <Stack.Screen options={{ title: t('workoutFormScreen.editTitle') }} />
          <View className="flex-1 bg-background p-4">
            <RequestErrorState
              title={t('workoutsScreen.error.title')}
              subtitle={t('workoutsScreen.error.subtitle')}
              retry={{ label: t('workoutsScreen.error.retry'), onPress: () => editQuery.refetch() }}
              testID="workout-form.error"
            />
          </View>
        </>
      );
    }
    return <WorkoutForm workout={editQuery.data} userId={userId ?? null} folderId={null} />;
  }

  return <WorkoutForm workout={null} userId={userId ?? null} folderId={folderId ?? null} />;
}

function WorkoutForm({
  workout,
  userId,
  folderId,
}: {
  workout: GetWorkoutResponse | null;
  userId: string | null;
  folderId: string | null;
}) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isEdit = workout !== null;
  const [newWorkoutId] = useState(() => Crypto.randomUUID());
  const targetWorkoutId = workout?.id ?? newWorkoutId;
  const bodyUserId = workout?.userId ?? userId ?? undefined;
  const targetFolderId = workout ? workout.folderId : folderId;

  const form = useForm<WorkoutFormInput, unknown, WorkoutFormValues>({
    resolver: zodResolver(WorkoutFormSchema),
    defaultValues: workout
      ? buildBuilderFromWorkout(workout)
      : { name: '', description: '', exercises: [] },
    mode: 'onTouched',
  });
  const { isDirty, errors } = useFormState({ control: form.control });
  const exercises = useWatch({ control: form.control, name: 'exercises' }) ?? [];

  const [tab, setTab] = useState<BuilderTab>('strength');
  const reorderSheetRef = useRef<SupersetReorderSheetRef>(null);

  const warmupItems = toExecutionListItems(exercises, 'preparatory', t, i18n.language);
  const strengthItems = toExecutionListItems(exercises, 'strength', t, i18n.language);
  const hasStrengthExercise = exercises.some((exercise) => exercise.exerciseType === 'strength');
  const items = tab === 'preparatory' ? warmupItems : strengthItems;
  const selection = useWorkoutSelection(items.map((item) => item.id));
  const selectionMode = selection.mode === 'select';

  const initialTabSetRef = useRef(false);
  useEffect(() => {
    if (initialTabSetRef.current) return;
    initialTabSetRef.current = true;
    if (warmupItems.length > 0) setTab('preparatory');
  }, [warmupItems.length]);

  const editing = useExerciseListEditing({
    items,
    exercises,
    selection,
    getExercises: () => form.getValues('exercises') ?? [],
    setExercises: (next) => form.setValue('exercises', next, { shouldDirty: true }),
    reorderSheetRef,
  });

  const mutation = useUpsertWorkout(targetWorkoutId, { userId: bodyUserId ?? null });

  const [hasSaved, setHasSaved] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingActionRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);

  usePreventRemove(isDirty && !hasSaved, ({ data }) => {
    pendingActionRef.current = data.action;
    setDiscardOpen(true);
  });

  useEffect(() => {
    if (hasSaved) router.back();
  }, [hasSaved]);

  const handleAddExercise = () => {
    openExercisePicker({
      onPick: (picked) => {
        if (picked.length === 0) return;
        const current = form.getValues('exercises') ?? [];
        const additions = picked.map((p, i) =>
          buildBuilderExerciseFromPicked(p, current.length + i, Crypto.randomUUID, tab),
        );
        form.setValue('exercises', [...current, ...additions], { shouldDirty: true });
      },
    });
  };

  const handleChangeTab = (value: BuilderTab) => {
    selection.exitSelect();
    setTab(value);
  };

  const handleSave = form.handleSubmit(
    (values) => {
      if (!values.exercises.some((exercise) => exercise.exerciseType === 'strength')) {
        Toast.show({
          type: 'error',
          text1: t('workoutFormScreen.noStrengthExercise.title'),
          text2: t('workoutFormScreen.noStrengthExercise.message'),
        });
        return;
      }
      mutation.mutate(
        toUpsertWorkoutRequest(values, { userId: bodyUserId, folderId: targetFolderId }),
        {
          onSuccess: () => {
            workoutObservability.trackAction(isEdit ? 'workout_updated' : 'workout_created', {
              exercises: values.exercises.length,
            });
            Toast.show({
              type: 'success',
              text1: isEdit
                ? t('workoutFormScreen.success.updatedTitle')
                : t('workoutFormScreen.success.createdTitle'),
            });
            setHasSaved(true);
          },
          onError: handleLocalError((error) => {
            workoutObservability.captureError(error, { action: 'upsert_workout' });
            Toast.show({
              type: 'error',
              text1: t('errors.unexpected.title'),
              text2: t('errors.unexpected.message'),
            });
          }),
        },
      );
    },
    () => {
      Toast.show({
        type: 'error',
        text1: t('workoutFormScreen.validationError.title'),
        text2: t('workoutFormScreen.validationError.message'),
      });
    },
  );

  // O botão nativo da toolbar (iOS) captura o onPress uma única vez; roteia por
  // ref para sempre ler o estado mais recente do form.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const onSave = useRef(() => handleSaveRef.current()).current;
  const handleAddExerciseRef = useRef(handleAddExercise);
  handleAddExerciseRef.current = handleAddExercise;
  const onAddExercise = useRef(() => handleAddExerciseRef.current()).current;

  const renderBuilderCard = (
    item: ReturnType<typeof toExecutionListItems>[number],
    dragHandle?: React.ReactNode,
  ) =>
    item.kind === 'superset' ? (
      <SupersetBuilderCard
        members={item.members}
        restSeconds={item.restSeconds}
        dragHandle={dragHandle}
        selectable={selectionMode}
        selected={selection.selected.has(item.id)}
        onToggleSelect={() => selection.toggle(item.id)}
        onLongPress={() => editing.handleLongPressItem(item.id)}
      />
    ) : (
      <ExerciseBuilderCard
        exerciseIndex={item.exerciseIndex}
        name={item.name}
        variationName={item.variationName ?? undefined}
        dragHandle={dragHandle}
        selectable={selectionMode}
        selected={selection.selected.has(item.id)}
        onToggleSelect={() => selection.toggle(item.id)}
        onLongPress={() => editing.handleLongPressItem(item.id)}
      />
    );

  return (
    <FormProvider {...form}>
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: isEdit ? t('workoutFormScreen.editTitle') : t('workoutFormScreen.createTitle'),
          }}
        />
        <View className="gap-3 px-4 pt-2 pb-1">
          <Field
            label={t('workoutFormScreen.fields.name')}
            error={errors.name?.message && t(errors.name.message)}
          >
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('workoutFormScreen.fields.namePlaceholder')}
                  testID="workout-form.name"
                />
              )}
            />
          </Field>
          <Field label={t('workoutFormScreen.fields.description')}>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('workoutFormScreen.fields.descriptionPlaceholder')}
                  multiline
                  textAlignVertical="top"
                  className="h-16 items-start py-2"
                  testID="workout-form.description"
                />
              )}
            />
          </Field>
        </View>
        <Tabs
          value={tab}
          onValueChange={(value) => handleChangeTab(value as BuilderTab)}
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
              onDeleteExercises={editing.handleDeleteExercises}
              onReorder={(ids) => editing.handleReorder('preparatory', ids)}
              selectionMode={selectionMode && tab === 'preparatory'}
              selectedIds={selection.selected}
              onToggleSelect={selection.toggle}
              onLongPressItem={editing.handleLongPressItem}
              renderCard={renderBuilderCard}
            />
          </TabsContent>
          <TabsContent value="strength" className="flex-1">
            <ExerciseExecutionList
              exercises={strengthItems}
              onAddExercise={handleAddExercise}
              onDeleteExercises={editing.handleDeleteExercises}
              onReorder={(ids) => editing.handleReorder('strength', ids)}
              selectionMode={selectionMode && tab === 'strength'}
              selectedIds={selection.selected}
              onToggleSelect={selection.toggle}
              onLongPressItem={editing.handleLongPressItem}
              renderCard={renderBuilderCard}
            />
          </TabsContent>
        </Tabs>
        {selectionMode ? (
          <SelectionToolbar
            count={selection.selected.size}
            onCancel={selection.exitSelect}
            allSelected={selection.allSelected}
            onToggleSelectAll={selection.toggleSelectAll}
            actions={editing.selectionActions}
          />
        ) : (
          <>
            <Stack.Screen options={{ headerLeft: undefined, headerRight: undefined }} />
            <WorkoutBuilderActions
              onSave={onSave}
              onAddExercise={onAddExercise}
              saving={mutation.isPending}
              canSave={hasStrengthExercise}
            />
          </>
        )}
        <SupersetReorderSheet ref={reorderSheetRef} />
        <ConfirmDialog
          open={discardOpen}
          onOpenChange={setDiscardOpen}
          title={t('workoutFormScreen.discard.title')}
          description={t('workoutFormScreen.discard.description')}
          confirmLabel={t('workoutFormScreen.discard.confirm')}
          cancelLabel={t('workoutFormScreen.discard.cancel')}
          destructive
          onConfirm={() => {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            if (action) {
              navigation.dispatch(action);
            }
          }}
          onCancel={() => {
            pendingActionRef.current = null;
          }}
        />
      </View>
    </FormProvider>
  );
}
