export type ObservabilityUser = { id: string } | null;

export type BreadcrumbCategory =
  | 'navigation'
  | 'auth'
  | 'workout'
  | 'exercise'
  | 'workout-log'
  | 'sync'
  | 'ui'
  | 'http';

export type BreadcrumbLevel = 'info' | 'warning' | 'error';

export type Breadcrumb = {
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, string | number | boolean>;
  level?: BreadcrumbLevel;
};

export type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export type CaptureMessageContext = CaptureContext & {
  level?: BreadcrumbLevel;
};

export type ObservabilityConfig = {
  dsn: string;
  environment: 'preview' | 'production';
  release: string;
  runtimeVersion: string;
  updateId?: string;
  tracesSampleRate: number;
  appVariant: string;
  locale: string;
};

export interface ObservabilityAdapter {
  init(config: ObservabilityConfig): void;
  setUser(user: ObservabilityUser): void;
  captureException(err: unknown, ctx?: CaptureContext): void;
  captureMessage(msg: string, ctx?: CaptureMessageContext): void;
  addBreadcrumb(crumb: Breadcrumb): void;
  setTag(key: string, value: string): void;
  startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> | T;
}
