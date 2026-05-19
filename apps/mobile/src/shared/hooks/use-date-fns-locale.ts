import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/internationalization/date-locale';

/**
 * The `date-fns` {@link import('date-fns').Locale} that matches the app's
 * current language. Re-renders (and recomputes) when the language changes —
 * i18next is the source of truth, driven by the `language$` store via
 * `LanguageBridge`, so there's nothing extra to persist.
 */
export function useDateFnsLocale() {
  const { i18n } = useTranslation();
  return useMemo(() => getDateFnsLocale(i18n.language), [i18n.language]);
}
