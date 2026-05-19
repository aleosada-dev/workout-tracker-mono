import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import pt from './locales/pt';

export function setupI18n(initialLanguage: string) {
  i18n.use(initReactI18next).init({
    resources: {
      en,
      pt,
    },
    lng: initialLanguage,
    fallbackLng: 'pt',
    supportedLngs: ['en', 'pt'],
    interpolation: {
      escapeValue: false,
    },
  });
  return i18n;
}

export default i18n;
