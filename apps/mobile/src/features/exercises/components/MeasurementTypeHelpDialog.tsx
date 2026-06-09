import { EXERCISE_MEASUREMENT_TYPES } from '@workout-tracker/domain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { CircleHelp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { MEASUREMENT_TYPE_ICONS } from './MeasurementTypeSelector';

export function MeasurementTypeHelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exercises.measurementTypeHelp.hint')}
          hitSlop={8}
          testID="exercise-form.measurementType.help-trigger"
        >
          <Icon as={CircleHelp} className="text-muted-foreground" size={16} />
        </Pressable>
      </DialogTrigger>
      <DialogContent testID="exercise-form.measurementType.help-dialog">
        <DialogHeader>
          <DialogTitle>{t('exercises.measurementTypeHelp.title')}</DialogTitle>
        </DialogHeader>
        <View className="gap-4">
          {EXERCISE_MEASUREMENT_TYPES.map((type) => (
            <View key={type} className="flex-row items-start gap-3">
              <Icon
                as={MEASUREMENT_TYPE_ICONS[type]}
                size={20}
                className="mt-0.5 shrink-0 text-muted-foreground"
              />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-sans-semibold text-foreground text-sm">
                  {t(`exercises.measurementType.${type}`)}
                </Text>
                <Text variant="muted">
                  {t(`exercises.measurementTypeHelp.descriptions.${type}`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </DialogContent>
    </Dialog>
  );
}
