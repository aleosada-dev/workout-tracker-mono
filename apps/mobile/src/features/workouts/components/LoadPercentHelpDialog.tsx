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
import { Pressable } from 'react-native';

export function LoadPercentHelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workoutFormScreen.exercise.loadPercentHelp.hint')}
          hitSlop={8}
          testID="workout-form.exercise.load-percent.help-trigger"
        >
          <Icon as={CircleHelp} className="text-muted-foreground" size={14} />
        </Pressable>
      </DialogTrigger>
      <DialogContent testID="workout-form.exercise.load-percent.help-dialog">
        <DialogHeader>
          <DialogTitle>{t('workoutFormScreen.exercise.loadPercentHelp.title')}</DialogTitle>
        </DialogHeader>
        <Text variant="muted">{t('workoutFormScreen.exercise.loadPercentHelp.description')}</Text>
      </DialogContent>
    </Dialog>
  );
}
