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
import { BarChart3, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';
import {
  useReanimatedFocusedInput,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { openExercisePicker } from '@/features/exercises/state/exercise-picker-bridge';
import { workoutObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import { SelectionToolbar } from '@/features/shared/components/SelectionToolbar';
import { useNavTheme } from '@/features/shared/lib/theme';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import { ExerciseBuilderCard } from '@/features/workouts/components/ExerciseBuilderCard';
import { ExerciseExecutionList } from '@/features/workouts/components/ExerciseExecutionList';
import {
  MuscleVolumeSheet,
  type MuscleVolumeSheetRef,
} from '@/features/workouts/components/MuscleVolumeSheet';
import { SupersetBuilderCard } from '@/features/workouts/components/SupersetBuilderCard';
import {
  SupersetReorderSheet,
  type SupersetReorderSheetRef,
} from '@/features/workouts/components/SupersetReorderSheet';
import { WorkoutBuilderActions } from '@/features/workouts/components/WorkoutBuilderActions';
import { WorkoutExecutionSkeleton } from '@/features/workouts/components/WorkoutExecutionSkeleton';
import {
  WorkoutsDeleteSheet,
  type WorkoutsDeleteSheetRef,
} from '@/features/workouts/components/WorkoutsDeleteSheet';
import { useDeleteWorkouts } from '@/features/workouts/hooks/use-delete-workouts';
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
  const navTheme = useNavTheme();
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
  const deleteSheetRef = useRef<WorkoutsDeleteSheetRef>(null);
  const volumeSheetRef = useRef<MuscleVolumeSheetRef>(null);

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
  const { mutate: deleteWorkout, isPending: isDeleting } = useDeleteWorkouts({
    userId: bodyUserId ?? null,
  });

  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingActionRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  // Saída intencional (após salvar/deletar): libera o guard de descartar sem
  // depender de um re-render, evitando que um commit extra corra com o pop.
  const allowLeaveRef = useRef(false);

  usePreventRemove(isDirty, ({ data }) => {
    if (allowLeaveRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    pendingActionRef.current = data.action;
    setDiscardOpen(true);
  });

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
            allowLeaveRef.current = true;
            router.back();
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

  const handleConfirmDelete = () => {
    if (!workout) return;
    deleteWorkout([workout.id], {
      onSuccess: ({ deletedIds }) => {
        workoutObservability.trackAction('workouts_deleted', { count: deletedIds.length });
        deleteSheetRef.current?.dismiss();
        Toast.show({
          type: 'success',
          text1: t('workoutsScreen.deleteWorkoutsDialog.success', { count: deletedIds.length }),
        });
        allowLeaveRef.current = true;
        router.back();
      },
      onError: handleLocalError((error) => {
        workoutObservability.captureError(error, { action: 'delete_workouts' });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      }),
    });
  };

  // O botão nativo da toolbar (iOS) captura o onPress uma única vez; roteia por
  // ref para sempre ler o estado mais recente do form.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const onSave = useRef(() => handleSaveRef.current()).current;
  const handleAddExerciseRef = useRef(handleAddExercise);
  handleAddExerciseRef.current = handleAddExercise;
  const onAddExercise = useRef(() => handleAddExerciseRef.current()).current;
  const onOpenVolume = useRef(() => volumeSheetRef.current?.present()).current;

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
        <Animated.View style={[{ flex: 1 }, tabsAnimatedStyle]}>
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
        </Animated.View>
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
            <Stack.Screen
              options={{
                headerLeft: undefined,
                headerRight: () => (
                  <View className="flex-row items-center">
                    {exercises.length > 0 ? (
                      <Pressable
                        onPress={onOpenVolume}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t('workoutFormScreen.muscleVolume.trigger')}
                        className="px-2"
                        testID="workout-form.volume"
                      >
                        <BarChart3 size={20} color={navTheme.colors.text} />
                      </Pressable>
                    ) : null}
                    {isEdit ? (
                      <Pressable
                        onPress={() => deleteSheetRef.current?.present()}
                        disabled={isDeleting}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t('workoutsScreen.deleteWorkoutsDialog.trigger')}
                        className="px-2"
                        testID="workout-form.delete"
                      >
                        <Trash2 size={20} color={navTheme.colors.notification} />
                      </Pressable>
                    ) : null}
                  </View>
                ),
              }}
            />
            <WorkoutBuilderActions
              onSave={onSave}
              onAddExercise={onAddExercise}
              saving={mutation.isPending}
              canSave={hasStrengthExercise}
            />
          </>
        )}
        <SupersetReorderSheet ref={reorderSheetRef} />
        <MuscleVolumeSheet ref={volumeSheetRef} />
        {isEdit ? (
          <WorkoutsDeleteSheet
            ref={deleteSheetRef}
            count={1}
            onConfirm={handleConfirmDelete}
            isPending={isDeleting}
          />
        ) : null}
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
