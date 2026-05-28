import { Button, Card, Checkbox, Icon, Input, Text } from '@workout-tracker/ui-mobile';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import { SetTypesHelpDialog } from '@/features/workouts/components/SetTypesHelpDialog';
import type { ExerciseExecutionCardProps, ExerciseExecutionSet } from './types';

const SET_TYPE_INITIAL: Record<SetType, string> = {
  warmup: 'W',
  normal: 'N',
  drop: 'D',
  cluster: 'C',
};

export function ExerciseExecutionCard({
  name,
  variationName,
  sets,
  dragHandle,
  onAddSet,
  onToggleDone,
  onChangeKg,
  onChangeReps,
  onChangeType,
}: ExerciseExecutionCardProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Animated.View layout={LinearTransition.springify().damping(20).stiffness(180)}>
      <Card className="gap-3 py-2">
        <View className="flex-row items-center justify-between gap-2 px-4">
          {dragHandle ?? <Icon as={GripVertical} size={18} className="text-muted-foreground" />}
          <View className="flex-1">
            <Text className="font-sans-semibold text-base" numberOfLines={1}>
              {name}
            </Text>
            {variationName ? (
              <Text variant="muted" className="text-xs" numberOfLines={1}>
                {variationName}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setCollapsed((c) => !c)}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Icon as={collapsed ? ChevronDown : ChevronUp} size={20} className="text-foreground" />
          </Pressable>
        </View>

        {!collapsed ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <View className="px-4">
              <View className="flex-row items-center pb-2">
                <View className="w-10">
                  <View className="flex-row items-center gap-1">
                    <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                      #
                    </Text>
                    <SetTypesHelpDialog />
                  </View>
                </View>
                <View className="flex-1 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    KG
                  </Text>
                </View>
                <View className="flex-1 px-2">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    REPS
                  </Text>
                </View>
                <View className="w-20 px-2">
                  <Text className="text-center font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    ALVO
                  </Text>
                </View>
                <View className="w-10 items-center">
                  <Text className="font-sans-medium text-muted-foreground text-xs uppercase tracking-wider">
                    ✓
                  </Text>
                </View>
              </View>

              {sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onToggleDone={onToggleDone}
                  onChangeKg={onChangeKg}
                  onChangeReps={onChangeReps}
                  onChangeType={onChangeType}
                />
              ))}
            </View>

            <View className="px-4 pt-2">
              <Button variant="outline" onPress={onAddSet} className="w-full">
                <Icon as={Plus} size={18} className="text-secondary-foreground" />
                <Text className="font-sans-semibold text-secondary-foreground">
                  {t('workoutExecutionScreen.exercise.addSet')}
                </Text>
              </Button>
            </View>
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

function SetRow({
  set,
  onToggleDone,
  onChangeKg,
  onChangeReps,
  onChangeType,
}: {
  set: ExerciseExecutionSet;
  onToggleDone?: (id: string) => void;
  onChangeKg?: (id: string, value: string) => void;
  onChangeReps?: (id: string, value: string) => void;
  onChangeType?: (id: string, type: SetType) => void;
}) {
  const typeConfig = SET_TYPE_CONFIG[set.type];
  return (
    <View className="flex-row items-center py-1">
      <View className="w-10">
        <Pressable
          onPress={() => onChangeType?.(set.id, set.type)}
          hitSlop={8}
          className="flex-row items-center gap-1"
          accessibilityRole="button"
        >
          <Text className={`font-sans-semibold text-base ${typeConfig.textColor}`}>
            {SET_TYPE_INITIAL[set.type]}
          </Text>
          <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
        </Pressable>
      </View>
      <View className="flex-1 px-2">
        <Input
          variant="outline-primary"
          keyboardType="numeric"
          value={set.kg}
          onChangeText={(value) => onChangeKg?.(set.id, value)}
        />
      </View>
      <View className="flex-1 px-2">
        <Input
          variant="outline-primary"
          keyboardType="numeric"
          value={set.reps}
          onChangeText={(value) => onChangeReps?.(set.id, value)}
        />
      </View>
      <View className="w-20 px-2">
        <Text variant="muted" className="text-center">
          {set.target}
        </Text>
      </View>
      <View className="w-10 items-center">
        <Checkbox checked={set.done} onCheckedChange={() => onToggleDone?.(set.id)} />
      </View>
    </View>
  );
}
