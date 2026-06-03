import { getValidSetTypesAt } from '@workout-tracker/domain';
import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Plus, Save, Trash2, X } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';
import type { SupersetMember } from '@/features/workouts/lib/workout-mappers';

const TYPE_ORDER: SetType[] = ['warmup', 'normal', 'drop', 'cluster'];

export type AddSetEntry = { exerciseIndex: number; type: SetType; setId?: string };

export type SupersetAddSetsMember = {
  exerciseIndex: number;
  letter: SupersetMember['letter'];
  name: string;
  existingTypes: SetType[];
};

type PresentOptions = {
  initialEntries?: AddSetEntry[];
  onDelete?: () => void;
};

export type SupersetAddSetsSheetRef = {
  present: (
    members: SupersetAddSetsMember[],
    onConfirm: (entries: AddSetEntry[]) => void,
    options?: PresentOptions,
  ) => void;
  dismiss: () => void;
};

function validTypesAt(
  entries: AddSetEntry[],
  members: SupersetAddSetsMember[],
  index: number,
): SetType[] {
  const entry = entries[index];
  const member = members.find((m) => m.exerciseIndex === entry.exerciseIndex);
  if (!member) return TYPE_ORDER;
  const priorForMember = entries
    .slice(0, index)
    .filter((x) => x.exerciseIndex === entry.exerciseIndex)
    .map((x) => x.type);
  const sequence = [...member.existingTypes, ...priorForMember, entry.type].map((type) => ({
    type,
  }));
  return getValidSetTypesAt(sequence, member.existingTypes.length + priorForMember.length);
}

function coerce(entries: AddSetEntry[], members: SupersetAddSetsMember[]): AddSetEntry[] {
  const result: AddSetEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const valid = validTypesAt([...result, entry], members, result.length);
    const type = valid.includes(entry.type)
      ? entry.type
      : valid.includes('normal')
        ? 'normal'
        : valid[0];
    result.push({ ...entry, type });
  }
  return result;
}

export function SupersetAddSetsSheet({ ref }: { ref?: Ref<SupersetAddSetsSheetRef> }) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [members, setMembers] = useState<SupersetAddSetsMember[]>([]);
  const [entries, setEntries] = useState<AddSetEntry[]>([]);
  const [isEdit, setIsEdit] = useState(false);
  const onConfirmRef = useRef<((entries: AddSetEntry[]) => void) | null>(null);
  const onDeleteRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    present: (nextMembers, onConfirm, options) => {
      setMembers(nextMembers);
      const initial =
        options?.initialEntries ??
        nextMembers.map((m) => ({ exerciseIndex: m.exerciseIndex, type: 'normal' as const }));
      setEntries(coerce(initial, nextMembers));
      setIsEdit(Boolean(options?.initialEntries));
      onConfirmRef.current = onConfirm;
      onDeleteRef.current = options?.onDelete ?? null;
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const update = (next: AddSetEntry[]) => setEntries(coerce(next, members));

  const addEntry = () => {
    const first = members[0];
    if (!first) return;
    update([...entries, { exerciseIndex: first.exerciseIndex, type: 'normal' }]);
  };

  const removeEntry = (index: number) => {
    update(entries.filter((_, i) => i !== index));
  };

  const changeExercise = (index: number, exerciseIndex: number) => {
    update(
      entries.map((entry, i) =>
        i === index ? { ...entry, exerciseIndex, setId: undefined } : entry,
      ),
    );
  };

  const changeType = (index: number, type: SetType) => {
    update(entries.map((entry, i) => (i === index ? { ...entry, type } : entry)));
  };

  const handleConfirm = () => {
    if (entries.length === 0) return;
    onConfirmRef.current?.(entries);
    sheetRef.current?.dismiss();
  };

  const handleDelete = () => {
    onDeleteRef.current?.();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
        <View className="items-center gap-2">
          <Text variant="h4" className="text-center">
            {t(
              isEdit
                ? 'workoutExecutionScreen.addSetsSheet.editTitle'
                : 'workoutExecutionScreen.addSetsSheet.title',
            )}
          </Text>
          <Text variant="muted" className="text-center text-sm">
            {t(
              isEdit
                ? 'workoutExecutionScreen.addSetsSheet.editSubtitle'
                : 'workoutExecutionScreen.addSetsSheet.subtitle',
            )}
          </Text>
        </View>

        <View className="gap-2">
          {members.map((member) => (
            <View key={member.exerciseIndex} className="flex-row items-center gap-2">
              <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Text className="font-sans-semibold text-[10px] text-primary-foreground">
                  {member.letter}
                </Text>
              </View>
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {member.name}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          {TYPE_ORDER.map((type) => {
            const config = SET_TYPE_CONFIG[type];
            return (
              <View key={type} className="flex-row items-center gap-1">
                <Text className={cn('font-sans-semibold text-xs', config.textColor)}>
                  {t(config.token)}
                </Text>
                <Text variant="muted" className="text-xs">
                  {t(config.label)}
                </Text>
              </View>
            );
          })}
        </View>

        <View className="gap-2">
          {entries.map((entry, index) => {
            const valid = validTypesAt(entries, members, index);
            return (
              <View
                // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional and reorder-free
                key={index}
                className="flex-row items-center gap-2 rounded-lg border border-border p-2"
              >
                <View className="flex-row gap-1">
                  {members.map((member) => {
                    const selected = member.exerciseIndex === entry.exerciseIndex;
                    return (
                      <Pressable
                        key={member.exerciseIndex}
                        onPress={() => changeExercise(index, member.exerciseIndex)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        testID={`superset-add-sets.entry.${index}.exercise.${member.exerciseIndex}`}
                        className={cn(
                          'h-7 w-7 items-center justify-center rounded-full border border-border',
                          selected ? 'border-primary bg-primary' : 'bg-transparent',
                        )}
                      >
                        <Text
                          className={cn(
                            'font-sans-semibold text-xs',
                            selected ? 'text-primary-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {member.letter}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="flex-1 flex-row justify-center gap-1">
                  {TYPE_ORDER.map((type) => {
                    const selected = entry.type === type;
                    const disabled = !valid.includes(type);
                    const config = SET_TYPE_CONFIG[type];
                    return (
                      <Pressable
                        key={type}
                        onPress={() => changeType(index, type)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled }}
                        testID={`superset-add-sets.entry.${index}.type.${type}`}
                        className={cn(
                          'h-7 w-9 items-center justify-center rounded-md border',
                          selected ? 'border-primary bg-primary/5' : 'border-border',
                          disabled && 'opacity-40',
                        )}
                      >
                        <Text className={cn('font-sans-semibold text-sm', config.textColor)}>
                          {t(config.token)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => removeEntry(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  testID={`superset-add-sets.entry.${index}.remove`}
                >
                  <Icon as={X} size={18} className="text-muted-foreground" />
                </Pressable>
              </View>
            );
          })}
        </View>

        <Button variant="outline" size="sm" onPress={addEntry} testID="superset-add-sets.add-entry">
          <Icon as={Plus} size={14} className="text-secondary-foreground" />
          <Text className="font-sans-semibold text-secondary-foreground text-sm">
            {t('workoutExecutionScreen.addSetsSheet.addEntry')}
          </Text>
        </Button>

        <View className="flex-row gap-3 pt-2">
          {isEdit ? (
            <Button
              variant="destructive"
              className="flex-1"
              onPress={handleDelete}
              testID="superset-add-sets.delete-round"
            >
              <Icon as={Trash2} size={16} className="text-white" />
              <Text className="font-sans-semibold text-sm text-white">
                {t('workoutExecutionScreen.addSetsSheet.deleteRound')}
              </Text>
            </Button>
          ) : null}

          <Button
            className="flex-1"
            onPress={handleConfirm}
            disabled={entries.length === 0}
            testID="superset-add-sets.confirm"
          >
            <Icon as={Save} size={16} className="text-primary-foreground" />
            <Text className="font-sans-semibold text-primary-foreground text-sm">
              {t(
                isEdit
                  ? 'workoutExecutionScreen.addSetsSheet.editConfirm'
                  : 'workoutExecutionScreen.addSetsSheet.confirm',
              )}
            </Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
