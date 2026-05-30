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
import { SupersetExecutionCard } from '@/features/workouts/components/SupersetExecutionCard';
import type { ExecutionListItem } from '@/features/workouts/lib/workout-mappers';

const COLLAPSED_CARD_HEIGHT = 70;
const SUPERSET_MEMBER_ROW_HEIGHT = 42;

type ListItem = ExecutionListItem | { kind: 'spacer'; id: '__spacer__' };

type ExerciseExecutionListProps = {
  exercises: ExecutionListItem[];
  onAddExercise?: () => void;
  onDeleteExercises?: (exerciseIndexes: number[]) => void;
  onReorder?: (orderedItemIds: string[]) => void;
};

export function ExerciseExecutionList({
  exercises,
  onAddExercise,
  onDeleteExercises,
  onReorder,
}: ExerciseExecutionListProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const spacerHeight = insets.bottom + (Platform.OS === 'ios' ? 70 : 90);
  const actionsWidth = windowWidth - 32;

  const estimateItemHeight = useCallback(
    (item: ListItem) => {
      if (item.kind === 'spacer') {
        return spacerHeight;
      }
      if (item.kind === 'superset') {
        return COLLAPSED_CARD_HEIGHT + item.members.length * SUPERSET_MEMBER_ROW_HEIGHT;
      }
      return COLLAPSED_CARD_HEIGHT;
    },
    [spacerHeight],
  );

  const handleDrop = useCallback(
    (_id: string, _position: number, allPositions?: { [id: string]: number }) => {
      if (!onReorder || !allPositions) return;
      const orderedItemIds = Object.keys(allPositions)
        .sort((a, b) => allPositions[a] - allPositions[b])
        .filter((itemId) => itemId !== '__spacer__');
      onReorder(orderedItemIds);
    },
    [onReorder],
  );

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
      const dragHandle = (
        <SortableItem.Handle>
          <Icon as={GripVertical} size={18} className="text-muted-foreground" />
        </SortableItem.Handle>
      );
      const card =
        item.kind === 'superset' ? (
          <SupersetExecutionCard
            members={item.members}
            restSeconds={item.restSeconds}
            dragHandle={dragHandle}
            onPressMember={(variationId) =>
              router.push({ pathname: '/exerciseDetail', params: { id: variationId } })
            }
          />
        ) : (
          <ExerciseExecutionCard
            exerciseIndex={item.exerciseIndex}
            name={item.name}
            variationName={item.variationName ?? undefined}
            note={item.note}
            restSeconds={item.restSeconds}
            onPressHeader={() =>
              router.push({ pathname: '/exerciseDetail', params: { id: item.variationId } })
            }
            dragHandle={dragHandle}
          />
        );
      const deleteIndexes =
        item.kind === 'superset' ? item.members.map((m) => m.exerciseIndex) : [item.exerciseIndex];
      return (
        <SortableItem key={id} id={id} data={item} {...rest} onDrop={handleDrop}>
          <View className="pb-3">
            {onDeleteExercises ? (
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
                      onPress={() => onDeleteExercises(deleteIndexes)}
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
    [spacerHeight, actionsWidth, onDeleteExercises, handleDrop, t],
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

  const data: ListItem[] = [...exercises, { kind: 'spacer', id: '__spacer__' }];

  return (
    <Sortable
      data={data}
      enableDynamicHeights
      itemHeight={estimateItemHeight}
      estimatedItemHeight={COLLAPSED_CARD_HEIGHT}
      renderItem={renderItem}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ backgroundColor: 'transparent', paddingTop: 12 }}
    />
  );
}
