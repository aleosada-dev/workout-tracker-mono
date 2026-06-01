import { Input, Label } from '@workout-tracker/ui-mobile';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

type DefaultRestSecondsFieldProps = {
  value: number | null;
  onChange: (next: number | null) => void;
};

export function DefaultRestSecondsField({ value, onChange }: DefaultRestSecondsFieldProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(value == null ? '' : String(value));

  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  const handleChangeText = (next: string) => {
    const cleaned = next.replace(/[^0-9]/g, '');
    setText(cleaned);
    onChange(cleaned === '' ? null : Number.parseInt(cleaned, 10));
  };

  return (
    <View className="gap-2">
      <Label>{t('preferencesScreen.defaultRestSeconds.label')}</Label>
      <Input
        value={text}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        placeholder={t('preferencesScreen.defaultRestSeconds.placeholder')}
        returnKeyType="done"
      />
    </View>
  );
}
