import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';

const persistPlugin = new ObservablePersistMMKV({ id: 'app-storage' });

export type ThemeMode = 'system' | 'light' | 'dark';

export const themeMode$ = observable<ThemeMode>('system');

syncObservable(themeMode$, {
  persist: {
    name: 'themeMode',
    plugin: persistPlugin,
  },
});

export function setThemeMode(mode: ThemeMode) {
  themeMode$.set(mode);
}

export const SUPPORTED_LANGUAGES = ['en', 'pt'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type LanguagePreference = 'system' | SupportedLanguage;

export const LANGUAGE_LABELS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: 'English',
  pt: 'Português',
};

export const language$ = observable<LanguagePreference>('system');

syncObservable(language$, {
  persist: {
    name: 'language',
    plugin: persistPlugin,
  },
});

export function setLanguage(language: LanguagePreference) {
  language$.set(language);
}

export const countWarmupSets$ = observable<boolean>(false);

syncObservable(countWarmupSets$, {
  persist: {
    name: 'countWarmupSets',
    plugin: persistPlugin,
  },
});

export function setCountWarmupSets(value: boolean) {
  countWarmupSets$.set(value);
}
