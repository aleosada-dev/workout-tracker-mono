import { useValue } from '@legendapp/state/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, MapPin, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { useTrainingLocations } from '@/features/training-locations/hooks/use-training-locations';
import { applySessionLocation } from '@/features/workouts/lib/apply-session-location';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';
import { activeWorkout$ } from '@/features/workouts/state/active-workout-store';

const NONE = '__none__';

export function SessionLocationPrompt({
  userId,
  dismissed = false,
  onAddLocation,
}: {
  userId?: string | null;
  dismissed?: boolean;
  onAddLocation?: () => void;
}) {
  const { t } = useTranslation();
  const { getValues, setValue } = useFormContext<ExecutionFormInput>();
  const chosen = useValue(activeWorkout$.locationChosen);
  const { data: locations } = useTrainingLocations(userId);
  const { data: preferences } = useUserPreferences();
  const [selected, setSelected] = useState<string>(NONE);
  const [seeded, setSeeded] = useState(false);

  // Pré-seleciona a preferência do atleta (se ela existe entre os locais), uma vez.
  // Aguarda data !== undefined (não isLoading): query desabilitada — sessão ainda
  // carregando, sem userId — reporta isLoading=false, e semear cedo abriria o
  // prompt antes dos locais carregarem.
  useEffect(() => {
    if (seeded || locations === undefined || preferences === undefined) return;
    const pref = preferences?.defaultTrainingLocationId ?? null;
    const exists = pref ? locations.some((l) => l.id === pref) : false;
    setSelected(exists && pref ? pref : NONE);
    setSeeded(true);
  }, [seeded, preferences, locations]);

  const open = !chosen && seeded && !dismissed;

  const confirm = () => {
    applySessionLocation(selected === NONE ? null : selected, { getValues, setValue });
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="gap-2">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            {t('workoutExecutionScreen.locationPrompt.title')}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <View className="items-center py-2">
          <Icon as={MapPin} size={56} className="text-primary" />
        </View>
        <AlertDialogDescription className="text-left">
          {t('workoutExecutionScreen.locationPrompt.subtitle')}
        </AlertDialogDescription>
        <ScrollView
          className="max-h-72"
          contentContainerClassName="gap-2"
          showsVerticalScrollIndicator={false}
        >
          <Option
            label={t('workoutExecutionScreen.locationPrompt.none')}
            selected={selected === NONE}
            onPress={() => setSelected(NONE)}
          />
          {(locations ?? []).map((location) => (
            <Option
              key={location.id}
              label={location.name}
              selected={selected === location.id}
              onPress={() => setSelected(location.id)}
            />
          ))}
        </ScrollView>
        {onAddLocation ? (
          <Button
            variant="outline"
            onPress={onAddLocation}
            testID="workout-execution.location.prompt-add"
            className="mb-4"
          >
            <Icon as={Plus} size={16} className="text-foreground" />
            <Text>{t('workoutExecutionScreen.locationPrompt.add')}</Text>
          </Button>
        ) : null}
        <AlertDialogAction onPress={confirm} testID="workout-execution.location.prompt-confirm">
          <Text>{t('workoutExecutionScreen.locationPrompt.confirm')}</Text>
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center justify-between rounded-lg border border-border p-3',
        selected && 'border-primary bg-primary/5',
      )}
    >
      <Text className="font-sans-semibold text-sm" numberOfLines={1}>
        {label}
      </Text>
      {selected ? <Icon as={Check} size={16} className="text-primary" /> : null}
    </Pressable>
  );
}
