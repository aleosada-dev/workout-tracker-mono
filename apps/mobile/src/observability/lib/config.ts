import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import i18n from '@/internationalization/i18n';
import type { ObservabilityConfig } from './types';

export function resolveConfig(): ObservabilityConfig {
  const variant = (Constants.expoConfig?.extra?.appVariant as string) ?? 'development';
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const runtimeVersion = String(Updates.runtimeVersion ?? 'unknown');

  return {
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    environment: variant === 'production' ? 'production' : 'preview',
    release: `workout-tracker-app@${version}+${runtimeVersion}`,
    runtimeVersion,
    updateId: Updates.updateId ?? undefined,
    tracesSampleRate: variant === 'production' ? 0.1 : 1.0,
    appVariant: variant,
    locale: i18n.language,
  };
}
