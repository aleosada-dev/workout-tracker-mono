import { observability } from './adapter';
import type { BreadcrumbCategory } from './types';

export type ModuleErrorContext = {
  action: string;
  extra?: Record<string, unknown>;
};

export type ModuleObservability = {
  trackAction(action: string, data?: Record<string, string | number>): void;
  captureError(err: unknown, ctx: ModuleErrorContext): void;
};

export function createModuleObservability(category: BreadcrumbCategory): ModuleObservability {
  return {
    trackAction(action, data) {
      observability.addBreadcrumb({ category, message: action, data });
    },
    captureError(err, ctx) {
      observability.captureException(err, {
        tags: { feature: category, action: ctx.action },
        extra: ctx.extra,
      });
    },
  };
}
