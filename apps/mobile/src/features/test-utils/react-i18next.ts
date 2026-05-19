export const createI18nMock = (strings: Record<string, string> = {}, language = 'pt') => ({
  useTranslation: () => ({
    t: (key: string) => strings[key] ?? key,
    i18n: { language },
  }),
});
