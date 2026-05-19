import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { useEffect } from 'react';
import {
  type LanguagePreference,
  language$,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './settings-store';

function getSystemLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode;
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    ? (code as SupportedLanguage)
    : 'pt';
}

export function resolveLanguage(preference: LanguagePreference): SupportedLanguage {
  return preference === 'system' ? getSystemLanguage() : preference;
}

export function LanguageBridge() {
  useEffect(() => {
    i18n.changeLanguage(resolveLanguage(language$.get()));
    return language$.onChange(({ value }) => {
      i18n.changeLanguage(resolveLanguage(value));
    });
  }, []);

  return null;
}
