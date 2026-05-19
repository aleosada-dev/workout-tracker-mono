import { consoleAdapter } from './adapters/console';
import { sentryAdapter } from './adapters/sentry';

export const observability = process.env.EXPO_PUBLIC_SENTRY_DSN ? sentryAdapter : consoleAdapter;
