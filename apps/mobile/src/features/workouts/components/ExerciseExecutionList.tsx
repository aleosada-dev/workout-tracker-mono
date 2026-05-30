import { EmptyState, Icon, Text } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { GripVertical, Trash2, X } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Sortable, SortableItem, type SortableRenderItemProps } from 'react-native-reanimated-dnd';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseExecutionCard } from '@/features/workouts/components/ExerciseExecutionCard';
import type { ExerciseExecutionItem } from '@/features/workouts/lib/workout-mappers';

const COLLAPSED_CARD_HEIGHT = 70;

type ListItem =
  | ({ kind: 'exercise' } & ExerciseExecutionItem)
  | { kind: 'spacer'; id: '__spacer__' };

type ExerciseExecutionListProps = {
  exercises: ExerciseExecutionItem[];
  onAddExercise?: () => void;
  onDeleteExercise?: (exerciseIndex: number) => void;
};

export function ExerciseExecutionList({
  exercises,
  onAddExercise,
  onDeleteExercise,
}: ExerciseExecutionListProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const spacerHeight = insets.bottom + (Platform.OS === 'ios' ? 70 : 90);
  const actionsWidth = windowWidth - 32;

  const renderItem = useCallback(
    (props: SortableRenderItemProps<ListItem>) => {
      const { item, id, ...rest } = props;
      if (item.kind === 'spacer') {
        return (
          <SortableItem key={id} id={id} data={item} {...rest}>
            <View pointerEvents="none" style={{ height: spacerHeight }}>
              <SortableItem.Handle>
                <View style={{ width: 0, height: 0 }} />
              </SortableItem.Handle>
            </View>
          </SortableItem>
        );
      }
      const card = (
        <ExerciseExecutionCard
          exerciseIndex={item.exerciseIndex}
          name={item.name}
          variationName={item.variationName ?? undefined}
          note={item.note}
          restSeconds={item.restSeconds}
          onPressHeader={() =>
            router.push({ pathname: '/exerciseDetail', params: { id: item.variationId } })
          }
          dragHandle={
            <SortableItem.Handle>
              <Icon as={GripVertical} size={18} className="text-muted-foreground" />
            </SortableItem.Handle>
          }
        />
      );
      return (
        <SortableItem key={id} id={id} data={item} {...rest}>
          <View className="pb-3">
            {onDeleteExercise ? (
              <ReanimatedSwipeable
                friction={2}
                rightThreshold={48}
                overshootRight={false}
                renderRightActions={(_progress, _translation, methods) => (
                  <View
                    style={{ width: actionsWidth }}
                    className="flex-row items-center justify-around"
                  >
                    <Pressable
                      onPress={() => methods.close()}
                      accessibilityRole="button"
                      accessibilityLabel={t('workoutExecutionScreen.exercise.cancel')}
                      className="items-center justify-center"
                    >
                      <Icon as={X} size={24} className="text-muted-foreground" />
                      <Text className="mt-1 font-sans-semibold text-muted-foreground text-sm">
                        {t('workoutExecutionScreen.exercise.cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onDeleteExercise(item.exerciseIndex)}
                      accessibilityRole="button"
                      accessibilityLabel={t('workoutExecutionScreen.exercise.delete')}
                      className="items-center justify-center"
                    >
                      <Icon as={Trash2} size={24} className="text-destructive" />
                      <Text className="mt-1 font-sans-semibold text-destructive text-sm">
                        {t('workoutExecutionScreen.exercise.delete')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              >
                {card}
              </ReanimatedSwipeable>
            ) : (
              card
            )}
          </View>
        </SortableItem>
      );
    },
    [spacerHeight, actionsWidth, onDeleteExercise, t],
  );

  if (exercises.length === 0) {
    return (
      <View className="px-1 pt-3">
        <EmptyState
          title={t('workoutExecutionScreen.empty.title')}
          subtitle={t('workoutExecutionScreen.empty.subtitle')}
          cta={
            onAddExercise
              ? { label: t('workoutExecutionScreen.actions.addExercise'), onPress: onAddExercise }
              : undefined
          }
        />
      </View>
    );
  }

  const data: ListItem[] = [
    ...exercises.map((e) => ({ kind: 'exercise' as const, ...e })),
    { kind: 'spacer', id: '__spacer__' },
  ];

  return (
    <Sortable
      data={data}
      enableDynamicHeights
      estimatedItemHeight={COLLAPSED_CARD_HEIGHT}
      renderItem={renderItem}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ backgroundColor: 'transparent', paddingTop: 12 }}
    />
  );
}
