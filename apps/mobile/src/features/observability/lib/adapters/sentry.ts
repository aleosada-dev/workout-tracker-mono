import * as Sentry from '@sentry/react-native';
import type {
  Breadcrumb,
  CaptureContext,
  CaptureMessageContext,
  ObservabilityAdapter,
  ObservabilityConfig,
  ObservabilityUser,
} from '../types';

// --- Filtros ---

const EXPECTED_ERROR_PATTERNS: RegExp[] = [
  /Network request failed/i,
  /Aborted/i,
  /AuthApiError.*refresh_token_not_found/i,
  /AuthSessionMissingError/i,
];

const NOISY_BREADCRUMB_URL_PATTERNS: RegExp[] = [/\/auth\/v1\/token/];

export function isExpectedError(message: string): boolean {
  return EXPECTED_ERROR_PATTERNS.some((p) => p.test(message));
}

function filterExpectedErrors(
  event: Sentry.ErrorEvent,
  hint: { originalException?: unknown },
): Sentry.ErrorEvent | null {
  const exc = hint?.originalException as { message?: string } | undefined;
  const msg = exc?.message ?? event.message ?? '';
  if (isExpectedError(msg)) return null;
  return event;
}

function filterNoiseBreadcrumbs(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (crumb.level === 'debug') return null;
  if (crumb.category === 'console' && crumb.level === 'log') return null;
  if (
    crumb.category === 'http' &&
    typeof (crumb.data as { url?: unknown } | undefined)?.url === 'string' &&
    NOISY_BREADCRUMB_URL_PATTERNS.some((p) => p.test((crumb.data as { url: string }).url))
  ) {
    return null;
  }
  return crumb;
}

// --- Adapter ---

export const sentryAdapter: ObservabilityAdapter = {
  init(config: ObservabilityConfig) {
    if (!config.dsn) {
      return;
    }

    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      dist: config.updateId ?? 'native',
      enableNative: true,
      enableAutoSessionTracking: true,
      enableAppStartTracking: true,
      enableNativeFramesTracking: true,
      enableStallTracking: true,
      tracesSampleRate: config.tracesSampleRate,
      attachStacktrace: true,
      sendDefaultPii: false,
      beforeSend: filterExpectedErrors,
      beforeBreadcrumb: filterNoiseBreadcrumbs,
      tracePropagationTargets: [
        /^http:\/\/localhost/,
        /^http:\/\/127\.0\.0\.1/,
        /^http:\/\/192\.168\.\d+\.\d+/,
        /^https:\/\/api-dev\.osadainc\.com\.br/,
        /^https:\/\/workout-tracker-api\.osadainc\.com\.br/,
      ],
      // reactNativeTracingIntegration is added automatically by the SDK
      // when tracesSampleRate > 0 (see @sentry/react-native default integrations).
    });

    Sentry.setTag('app_variant', config.appVariant);
    Sentry.setTag('locale', config.locale);
    Sentry.setTag('runtime_version', config.runtimeVersion);
    if (config.updateId) Sentry.setTag('update_id', config.updateId);
  },

  setUser(user: ObservabilityUser) {
    Sentry.setUser(user ? { id: user.id } : null);
  },

  captureException(err: unknown, ctx?: CaptureContext) {
    Sentry.withScope((scope) => {
      if (ctx?.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx?.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      Sentry.captureException(err);
    });
  },

  captureMessage(msg: string, ctx?: CaptureMessageContext) {
    Sentry.withScope((scope) => {
      if (ctx?.tags) {
        for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
      }
      if (ctx?.extra) {
        for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
      }
      Sentry.captureMessage(msg, ctx?.level ?? 'info');
    });
  },

  addBreadcrumb(crumb: Breadcrumb) {
    Sentry.addBreadcrumb({
      category: crumb.category,
      message: crumb.message,
      data: crumb.data,
      level: crumb.level ?? 'info',
    });
  },

  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  },

  startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> | T {
    return Sentry.startSpan({ name, op }, fn);
  },
};
