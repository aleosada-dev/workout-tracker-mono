import { Button, Text } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type FallbackErrorScreenProps = {
  onRetry: () => void;
};

export function FallbackErrorScreen({ onRetry }: FallbackErrorScreenProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6">
      <Text variant="h2" className="text-center">
        {t('errors.unexpected.title')}
      </Text>
      <Text className="text-center text-muted-foreground">{t('errors.unexpected.message')}</Text>
      <Button onPress={onRetry} variant="default">
        <Text>{t('errors.unexpected.retry')}</Text>
      </Button>
    </View>
  );
}
