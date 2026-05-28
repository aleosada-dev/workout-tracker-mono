import {
  cn,
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
import { SET_TYPE_CONFIG, type SetType } from '@/features/exercises/lib/sets';

const SET_TYPE_ORDER: SetType[] = ['warmup', 'normal', 'drop', 'cluster'];

export function SetTypesHelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exerciseDetailScreen.sets.types.helpHint')}
          hitSlop={8}
          testID="exercise-detail.sets.types.help-trigger"
        >
          <Icon as={CircleHelp} className="text-muted-foreground" size={14} />
        </Pressable>
      </DialogTrigger>
      <DialogContent testID="exercise-detail.sets.types.help-dialog">
        <DialogHeader>
          <DialogTitle>{t('exerciseDetailScreen.sets.types.helpTitle')}</DialogTitle>
        </DialogHeader>
        <View className="gap-4">
          {SET_TYPE_ORDER.map((type) => {
            const config = SET_TYPE_CONFIG[type];
            return (
              <View key={type} className="gap-1">
                <Text className={cn('font-sans-semibold text-sm', config.textColor)}>
                  {t(config.token)} — {t(config.label)}
                </Text>
                <Text variant="muted">
                  {t(`exerciseDetailScreen.sets.types.descriptions.${type}`)}
                </Text>
              </View>
            );
          })}
        </View>
      </DialogContent>
    </Dialog>
  );
}
