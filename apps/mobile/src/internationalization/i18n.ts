import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resolveLanguage } from '@/settings/state/language-bridge';
import { language$ } from '@/settings/state/settings-store';
import en from './locales/en';
import pt from './locales/pt';

i18n.use(initReactI18next).init({
  resources: {
    en,
    pt,
  },
  lng: resolveLanguage(language$.get()),
  fallbackLng: 'pt',
  supportedLngs: ['en', 'pt'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
