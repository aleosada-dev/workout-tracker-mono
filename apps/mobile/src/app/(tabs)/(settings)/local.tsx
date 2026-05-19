import { Label } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { LanguageSelect } from '@/features/settings/components/language-select';

export default function LocalScreen() {
  const { t } = useTranslation();
  return (
    <View className="gap-2 p-4">
      <Label>{t('settings.languageLabel')}</Label>
      <LanguageSelect />
    </View>
  );
}
