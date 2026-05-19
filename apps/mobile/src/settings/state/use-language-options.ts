import { useTranslation } from 'react-i18next';
import { LANGUAGE_LABELS, type LanguagePreference, SUPPORTED_LANGUAGES } from './settings-store';

export type LanguageOption = {
  value: LanguagePreference;
  label: string;
};

export function useLanguageOptions(): LanguageOption[] {
  const { t } = useTranslation();
  return [
    { value: 'system', label: t('common.languageSystem') },
    ...SUPPORTED_LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] })),
  ];
}
