import { EmptyState, Icon, Text } from '@workout-tracker/ui-mobile';
import { router } from 'expo-router';
import { GripVertical, Trash2, X } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Sortable, SortableItem, type SortableRenderItemProps } from 'react-native-reanimated-dnd';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseExecutionCard } from '@/features/workouts/components/ExerciseExecutionCard';
import { SupersetExecutionCard } from '@/features/workouts/components/SupersetExecutionCard';
import type { ExecutionListItem } from '@/features/workouts/lib/workout-mappers';

// Alturas do estado COLAPSADO, derivadas dos estilos dos cards. Servem de altura
// reservada no Sortable (alturas dinâmicas); manter próximas do real evita vão/sobreposição
// antes do onLayout medir. O onLayout corrige quando o card expande.
const COLLAPSED_CARD_HEIGHT = 70; // ExerciseExecutionCard colapsado (py-2 + nome/variação + pb-3)
const SUPERSET_BASE_HEIGHT = 64; // Card py-2 + header (title) + gap-3 + pb-3
const SUPERSET_MEMBER_ROW_HEIGHT = 20; // linha do nome do membro (text-sm)
const SUPERSET_MEMBER_VARIATION_HEIGHT = 16; // linha extra da variação (text-xs)
const SUPERSET_MEMBER_GAP = 8; // gap-2 entre membros

type ListItem = ExecutionListItem | { kind: 'spacer'; id: '__spacer__' };

type ExerciseExecutionListProps = {
  exercises: ExecutionListItem[];
  onAddExercise?: () => void;
  onDeleteExercises?: (exerciseIndexes: number[]) => void;
  onReorder?: (orderedItemIds: string[]) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onLongPressItem?: (id: string) => void;
  /** Athlete whose logs the detail screen should show — defaults to the logged-in user. */
  userId?: string | null;
  /** Display name of that athlete, surfaced on the detail screen when viewing their data. */
  athleteName?: string | null;
  /** Substitui os cards de execução (default) — usado pelo builder de treino. */
  renderCard?: (item: ExecutionListItem, dragHandle?: React.ReactNode) => React.ReactNode;
};

export function ExerciseExecutionList({
  exercises,
  onAddExercise,
  onDeleteExercises,
  onReorder,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onLongPressItem,
  userId,
  athleteName,
  renderCard: renderCardOverride,
}: ExerciseExecutionListProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const spacerHeight = insets.bottom + (Platform.OS === 'ios' ? 70 : 90);
  const actionsWidth = windowWidth - 32;

  const renderDefaultCard = useCallback(
    (item: ExecutionListItem, dragHandle?: React.ReactNode) =>
      item.kind === 'superset' ? (
        <SupersetExecutionCard
          members={item.members}
          restSeconds={item.restSeconds}
          dragHandle={dragHandle}
          selectable={selectionMode}
          selected={selectedIds?.has(item.id) ?? false}
          onToggleSelect={() => onToggleSelect?.(item.id)}
          onLongPress={() => onLongPressItem?.(item.id)}
          onPressMember={(variationId, aliasId) =>
            router.push({
              pathname: '/exerciseDetail',
              params: {
                id: variationId,
                ...(aliasId ? { aliasId } : {}),
                ...(userId ? { userId } : {}),
                ...(userId && athleteName ? { athleteName } : {}),
              },
            })
          }
        />
      ) : (
        <ExerciseExecutionCard
          exerciseIndex={item.exerciseIndex}
          name={item.name}
          variationName={item.variationName ?? undefined}
          note={item.note}
          restSeconds={item.restSeconds}
          dragHandle={dragHandle}
          selectable={selectionMode}
          selected={selectedIds?.has(item.id) ?? false}
          onToggleSelect={() => onToggleSelect?.(item.id)}
          onLongPress={() => onLongPressItem?.(item.id)}
          onPressHeader={() =>
            router.push({
              pathname: '/exerciseDetail',
              params: {
                id: item.variationId,
                ...(item.aliasId ? { aliasId: item.aliasId } : {}),
                ...(userId ? { userId } : {}),
                ...(userId && athleteName ? { athleteName } : {}),
              },
            })
          }
        />
      ),
    [selectionMode, selectedIds, onToggleSelect, onLongPressItem, userId, athleteName],
  );

  const renderCard = renderCardOverride ?? renderDefaultCard;

  const estimateItemHeight = useCallback(
    (item: ListItem) => {
      if (item.kind === 'spacer') {
        return spacerHeight;
      }
      if (item.kind === 'superset') {
        const membersHeight = item.members.reduce(
          (sum, m) =>
            sum +
            SUPERSET_MEMBER_ROW_HEIGHT +
            (m.variationName != null ? SUPERSET_MEMBER_VARIATION_HEIGHT : 0),
          0,
        );
        const gaps = Math.max(0, item.members.length - 1) * SUPERSET_MEMBER_GAP;
        return SUPERSET_BASE_HEIGHT + membersHeight + gaps;
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
        // padding amplia a área de toque do drag; a margem negativa compensa para o
        // ícone não deslocar visualmente o cabeçalho do card.
        <SortableItem.Handle style={{ paddingVertical: 14, paddingHorizontal: 10, margin: -10 }}>
          <Icon as={GripVertical} size={18} className="text-muted-foreground" />
        </SortableItem.Handle>
      );
      const card = renderCard(item, dragHandle);
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
    [spacerHeight, actionsWidth, onDeleteExercises, handleDrop, renderCard, t],
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

  if (selectionMode) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: spacerHeight }}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((item) => (
          <View key={item.id} className="pb-3">
            {renderCard(item)}
          </View>
        ))}
      </ScrollView>
    );
  }

  const data: ListItem[] = [...exercises, { kind: 'spacer', id: '__spacer__' }];

  return (
    <Sortable
      data={data}
      enableDynamicHeights
      // ScrollView (não FlatList): renderiza todos os itens no mount, então o onLayout
      // de cada card dispara e as alturas dinâmicas são medidas corretamente de imediato.
      // Com FlatList a virtualização adiava o onLayout e o card recém-criado (ex.: superset)
      // ficava preso na estimativa, deixando um vão até um colapse/expand forçar a remedição.
      useFlatList={false}
      itemHeight={estimateItemHeight}
      estimatedItemHeight={COLLAPSED_CARD_HEIGHT}
      renderItem={renderItem}
      style={{ backgroundColor: 'transparent' }}
      contentContainerStyle={{ backgroundColor: 'transparent', paddingTop: 12 }}
    />
  );
}
