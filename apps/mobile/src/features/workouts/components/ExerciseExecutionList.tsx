import { EmptyState, Icon } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { GripVertical } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
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
};

export function ExerciseExecutionList({ exercises, onAddExercise }: ExerciseExecutionListProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const spacerHeight = insets.bottom + (Platform.OS === 'ios' ? 70 : 90);

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
      return (
        <SortableItem key={id} id={id} data={item} {...rest}>
          <View className="pb-3">
            <ExerciseExecutionCard
              exerciseIndex={item.exerciseIndex}
              name={item.name}
              variationName={item.variationName ?? undefined}
              setTargets={item.setTargets}
              onPressHeader={() =>
                router.push({ pathname: '/exerciseDetail', params: { id: item.variationId } })
              }
              dragHandle={
                <SortableItem.Handle>
                  <Icon as={GripVertical} size={18} className="text-muted-foreground" />
                </SortableItem.Handle>
              }
            />
          </View>
        </SortableItem>
      );
    },
    [spacerHeight],
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
