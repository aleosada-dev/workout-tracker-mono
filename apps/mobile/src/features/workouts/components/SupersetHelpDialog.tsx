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

export function SupersetHelpDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workoutExecutionScreen.superset.help.title')}
          hitSlop={8}
          testID="workout-execution.superset.help-trigger"
        >
          <Icon as={CircleHelp} className="text-muted-foreground" size={14} />
        </Pressable>
      </DialogTrigger>
      <DialogContent testID="workout-execution.superset.help-dialog">
        <DialogHeader>
          <DialogTitle>{t('workoutExecutionScreen.superset.help.title')}</DialogTitle>
        </DialogHeader>
        <Text variant="muted">{t('workoutExecutionScreen.superset.help.description')}</Text>
      </DialogContent>
    </Dialog>
  );
}
