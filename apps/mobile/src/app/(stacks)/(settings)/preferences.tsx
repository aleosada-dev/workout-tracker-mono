import type { UserPreferences } from '@workout-tracker/domain';
import {
  Button,
  Label,
  RequestErrorState,
  SectionHeading,
  Separator,
  Skeleton,
  Text,
} from '@workout-tracker/ui-mobile';
import { Dumbbell, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultRestSecondsField } from '@/features/preferences/components/default-rest-seconds-field';
import { LoadRoundingSelect } from '@/features/preferences/components/load-rounding-select';
import { PreferenceSwitchRow } from '@/features/preferences/components/preference-switch-row';
import { WeightUnitSelect } from '@/features/preferences/components/weight-unit-select';
import { useUpdateUserPreferences } from '@/features/preferences/hooks/use-update-user-preferences';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { LanguageSelect } from '@/features/settings/components/language-select';
import { ThemeToggle } from '@/features/settings/components/theme-toggle';

type WorkoutDraft = Pick<
  UserPreferences,
  'weightUnit' | 'defaultRestSeconds' | 'countWarmupSets' | 'autoStartRestTimer' | 'loadRounding'
>;

function toDraft(preferences: UserPreferences): WorkoutDraft {
  return {
    weightUnit: preferences.weightUnit,
    defaultRestSeconds: preferences.defaultRestSeconds,
    countWarmupSets: preferences.countWarmupSets,
    autoStartRestTimer: preferences.autoStartRestTimer,
    loadRounding: preferences.loadRounding,
  };
}

function isSameDraft(a: WorkoutDraft, b: WorkoutDraft): boolean {
  return (
    a.weightUnit === b.weightUnit &&
    a.defaultRestSeconds === b.defaultRestSeconds &&
    a.countWarmupSets === b.countWarmupSets &&
    a.autoStartRestTimer === b.autoStartRestTimer &&
    a.loadRounding === b.loadRounding
  );
}

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useUserPreferences();
  const { mutate, isPending } = useUpdateUserPreferences();
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);

  // Re-seed the draft whenever the saved preferences change identity (initial
  // load and after a successful save). react-query keeps a stable reference
  // between renders, so in-progress edits are not clobbered while editing.
  useEffect(() => {
    if (data) setDraft(toDraft(data));
  }, [data]);

  const showForm = !isLoading && !isError && !!data && !!draft;
  const dirty = showForm && !isSameDraft(draft, toDraft(data));

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4 pb-28">
        <SectionHeading
          icon={SlidersHorizontal}
          iconClassName="text-foreground"
          title={t('preferencesScreen.sections.general')}
        />

        <View className="gap-2">
          <Label>{t('settings.themeLabel')}</Label>
          <ThemeToggle />
        </View>

        <View className="gap-2">
          <Label>{t('settings.languageLabel')}</Label>
          <LanguageSelect />
        </View>

        <Separator />

        <SectionHeading
          icon={Dumbbell}
          iconClassName="text-foreground"
          title={t('preferencesScreen.sections.workout')}
        />

        {isError ? (
          <RequestErrorState
            title={t('preferencesScreen.error.title')}
            subtitle={t('preferencesScreen.error.subtitle')}
            retry={{ label: t('preferencesScreen.error.retry'), onPress: () => refetch() }}
            testID="preferences.error"
          />
        ) : !draft ? (
          <View className="gap-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Label>{t('preferencesScreen.weightUnit.label')}</Label>
              <WeightUnitSelect
                value={draft.weightUnit}
                onValueChange={(weightUnit) => setDraft((prev) => prev && { ...prev, weightUnit })}
              />
            </View>

            <View className="gap-2">
              <Label>{t('preferencesScreen.loadRounding.label')}</Label>
              <Text variant="muted" className="text-sm">
                {t('preferencesScreen.loadRounding.description')}
              </Text>
              <LoadRoundingSelect
                value={draft.loadRounding}
                onValueChange={(loadRounding) =>
                  setDraft((prev) => prev && { ...prev, loadRounding })
                }
              />
            </View>

            <DefaultRestSecondsField
              value={draft.defaultRestSeconds}
              onChange={(defaultRestSeconds) =>
                setDraft((prev) => prev && { ...prev, defaultRestSeconds })
              }
            />

            <PreferenceSwitchRow
              label={t('preferencesScreen.autoStartRestTimer.label')}
              description={t('preferencesScreen.autoStartRestTimer.description')}
              value={draft.autoStartRestTimer}
              onValueChange={(autoStartRestTimer) =>
                setDraft((prev) => prev && { ...prev, autoStartRestTimer })
              }
            />

            <PreferenceSwitchRow
              label={t('preferencesScreen.countWarmupSets.label')}
              description={t('preferencesScreen.countWarmupSets.description')}
              value={draft.countWarmupSets}
              onValueChange={(countWarmupSets) =>
                setDraft((prev) => prev && { ...prev, countWarmupSets })
              }
            />
          </>
        )}
      </ScrollView>

      {showForm ? (
        <View
          pointerEvents="box-none"
          className="absolute right-0 bottom-0 left-0 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            onPress={() => mutate(draft)}
            disabled={!dirty || isPending}
            className="h-12 rounded-full"
            testID="preferences.save"
          >
            <Text className="font-sans-semibold">{t('preferencesScreen.save')}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}
