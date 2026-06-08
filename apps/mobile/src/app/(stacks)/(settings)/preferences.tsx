import type { UserPreferences } from '@workout-tracker/domain';
import {
  Label,
  RequestErrorState,
  SectionHeading,
  Separator,
  Skeleton,
  Text,
} from '@workout-tracker/ui-mobile';
import { Dumbbell, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { preferencesObservability } from '@/features/observability/lib';
import { DefaultLocationField } from '@/features/preferences/components/default-location-field';
import { DefaultRestSecondsField } from '@/features/preferences/components/default-rest-seconds-field';
import { LoadRoundingSelect } from '@/features/preferences/components/load-rounding-select';
import { PreferencesActions } from '@/features/preferences/components/PreferencesActions';
import { PreferenceSwitchRow } from '@/features/preferences/components/preference-switch-row';
import { WeightUnitSelect } from '@/features/preferences/components/weight-unit-select';
import { useUpdateUserPreferences } from '@/features/preferences/hooks/use-update-user-preferences';
import { useUserPreferences } from '@/features/preferences/hooks/use-user-preferences';
import { LanguageSelect } from '@/features/settings/components/language-select';
import { ThemeToggle } from '@/features/settings/components/theme-toggle';

type WorkoutDraft = Pick<
  UserPreferences,
  | 'weightUnit'
  | 'defaultRestSeconds'
  | 'countWarmupSets'
  | 'autoStartRestTimer'
  | 'loadRounding'
  | 'defaultTrainingLocationId'
>;

function toDraft(preferences: UserPreferences): WorkoutDraft {
  return {
    weightUnit: preferences.weightUnit,
    defaultRestSeconds: preferences.defaultRestSeconds,
    countWarmupSets: preferences.countWarmupSets,
    autoStartRestTimer: preferences.autoStartRestTimer,
    loadRounding: preferences.loadRounding,
    defaultTrainingLocationId: preferences.defaultTrainingLocationId,
  };
}

function isSameDraft(a: WorkoutDraft, b: WorkoutDraft): boolean {
  return (
    a.weightUnit === b.weightUnit &&
    a.defaultRestSeconds === b.defaultRestSeconds &&
    a.countWarmupSets === b.countWarmupSets &&
    a.autoStartRestTimer === b.autoStartRestTimer &&
    a.loadRounding === b.loadRounding &&
    a.defaultTrainingLocationId === b.defaultTrainingLocationId
  );
}

export default function PreferencesScreen() {
  const { t } = useTranslation();
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

  const handleSave = () => {
    if (!draft) return;
    mutate(draft, {
      onSuccess: () => {
        preferencesObservability.trackAction('preferences_updated');
        Toast.show({
          type: 'success',
          text1: t('preferencesScreen.saved.title'),
        });
      },
      onError: (error) => {
        preferencesObservability.captureError(error, { action: 'update_preferences' });
        Toast.show({
          type: 'error',
          text1: t('errors.unexpected.title'),
          text2: t('errors.unexpected.message'),
        });
      },
    });
  };

  // The native iOS toolbar button captures its onPress once, so route it through
  // a ref to keep the handler reading the latest draft/state on every tap.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const onSave = useRef(() => handleSaveRef.current()).current;

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
              <Label>{t('preferencesScreen.defaultLocation.label')}</Label>
              <Text variant="muted" className="text-sm">
                {t('preferencesScreen.defaultLocation.description')}
              </Text>
              <DefaultLocationField
                value={draft.defaultTrainingLocationId}
                onValueChange={(defaultTrainingLocationId) =>
                  setDraft((prev) => prev && { ...prev, defaultTrainingLocationId })
                }
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

      {showForm ? <PreferencesActions onSave={onSave} isPending={isPending} dirty={dirty} /> : null}
    </View>
  );
}
