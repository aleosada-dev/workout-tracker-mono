import { EmptyState, Icon } from '@workout-tracker/ui-mobile';
import { GripVertical } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { Sortable, SortableItem, type SortableRenderItemProps } from 'react-native-reanimated-dnd';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExerciseExecutionCard,
  type ExerciseExecutionSet,
} from '@/features/workouts/components/ExerciseExecutionCard';

type ExerciseMock = {
  id: string;
  name: string;
  variationName: string;
  sets: ExerciseExecutionSet[];
};

type ListItem = ({ kind: 'exercise' } & ExerciseMock) | { kind: 'spacer'; id: '__spacer__' };

const MOCK_SETS_AGACHAMENTO: ExerciseExecutionSet[] = [
  { id: '1', type: 'warmup', kg: '20', reps: '5', target: '1-5', done: false },
  { id: '2', type: 'warmup', kg: '40', reps: '5', target: '1-5', done: false },
  { id: '3', type: 'normal', kg: '60', reps: '8', target: '10-12', done: false },
  { id: '4', type: 'normal', kg: '65', reps: '6', target: '10-12', done: false },
];

const MOCK_SETS_SUPINO: ExerciseExecutionSet[] = [
  { id: '1', type: 'normal', kg: '40', reps: '10', target: '8-12', done: false },
  { id: '2', type: 'normal', kg: '45', reps: '8', target: '8-12', done: false },
  { id: '3', type: 'drop', kg: '30', reps: '12', target: '8-12', done: false },
];

const MOCK_EXERCISES: ExerciseMock[] = [
  {
    id: 'agachamento',
    name: 'Agachamento',
    variationName: 'Livre com Barra',
    sets: MOCK_SETS_AGACHAMENTO,
  },
  {
    id: 'supino',
    name: 'Supino',
    variationName: 'Reto com Halteres',
    sets: MOCK_SETS_SUPINO,
  },
];

type ExerciseExecutionListProps = {
  onAddExercise?: () => void;
};

export function ExerciseExecutionList({ onAddExercise }: ExerciseExecutionListProps = {}) {
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
              name={item.name}
              variationName={item.variationName}
              sets={item.sets}
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

  if (MOCK_EXERCISES.length === 0) {
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
    ...MOCK_EXERCISES.map((e) => ({ kind: 'exercise' as const, ...e })),
    { kind: 'spacer', id: '__spacer__' },
  ];

  return (
    <Sortable
      data={data}
      enableDynamicHeights
      estimatedItemHeight={320}
      renderItem={renderItem}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ backgroundColor: 'transparent', paddingTop: 12 }}
    />
  );
}
