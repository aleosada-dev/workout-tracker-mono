import { Input } from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

export type ExerciseSearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  testID?: string;
};

export function ExerciseSearchField({
  value,
  onChangeText,
  testID = 'exercises-list.search',
}: ExerciseSearchFieldProps) {
  const { t } = useTranslation();
  return (
    <View className="px-4 pt-4 pb-3">
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={t('exerciseListScreen.searchPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        testID={testID}
      />
    </View>
  );
}
