import { Button, Icon, Text } from '@workout-tracker/ui-mobile';
import { Save } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PreferencesActionsProps } from './types';

export function PreferencesActions({ onSave, isPending, dirty }: PreferencesActionsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 bottom-0 left-0 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Button
        onPress={onSave}
        disabled={isPending || !dirty}
        className="h-12 rounded-full"
        testID="preferences.save"
      >
        <Icon as={Save} size={18} className="text-primary-foreground" />
        <Text className="font-sans-semibold">{t('preferencesScreen.save')}</Text>
      </Button>
    </View>
  );
}
