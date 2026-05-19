import { Label } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ThemeToggle } from '@/settings/components/theme-toggle';

export default function AppearanceScreen() {
  const { t } = useTranslation();
  return (
    <View className="gap-2 p-4">
      <Label>{t('settings.themeLabel')}</Label>
      <ThemeToggle />
    </View>
  );
}
