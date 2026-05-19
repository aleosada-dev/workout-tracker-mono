import type {
  Breadcrumb,
  CaptureContext,
  CaptureMessageContext,
  ObservabilityAdapter,
  ObservabilityConfig,
  ObservabilityUser,
} from '../types';

const PREFIX = '[obs]';

function fmtCtx(ctx?: CaptureContext): string {
  if (!ctx) return '';
  const parts: string[] = [];
  if (ctx.tags) {
    for (const [k, v] of Object.entries(ctx.tags)) parts.push(`${k}=${v}`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

export const consoleAdapter: ObservabilityAdapter = {
  init(config: ObservabilityConfig) {
    console.log(
      `${PREFIX} init env=${config.environment} variant=${config.appVariant} locale=${config.locale} runtime=${config.runtimeVersion}${
        config.updateId ? ` update=${config.updateId}` : ''
      }`,
    );
  },

  setUser(user: ObservabilityUser) {
    if (user) console.log(`${PREFIX} setUser id=${user.id}`);
    else console.log(`${PREFIX} setUser <anonymous>`);
  },

  captureException(err: unknown, ctx?: CaptureContext) {
    console.warn(`${PREFIX} captureException${fmtCtx(ctx)}`);
    if (ctx?.extra) console.warn('       extra:', ctx.extra);
    console.warn('      ', err);
  },

  captureMessage(msg: string, ctx?: CaptureMessageContext) {
    const level = ctx?.level ?? 'info';
    const fn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
    fn(`${PREFIX} captureMessage [${level}]${fmtCtx(ctx)} ${msg}`);
    if (ctx?.extra) fn('       extra:', ctx.extra);
  },

  addBreadcrumb(crumb: Breadcrumb) {
    console.log(`${PREFIX} addBreadcrumb category=${crumb.category} message="${crumb.message}"`);
    if (crumb.data) console.log('       data:', crumb.data);
  },

  setTag(key: string, value: string) {
    console.log(`${PREFIX} setTag ${key}=${value}`);
  },

  async startSpan<T>(name: string, op: string, fn: () => Promise<T> | T): Promise<T> {
    console.log(`${PREFIX} startSpan op=${op} name="${name}"`);
    const start = Date.now();
    try {
      const result = await fn();
      console.log(`${PREFIX} endSpan op=${op} name="${name}" duration=${Date.now() - start}ms`);
      return result;
    } catch (err) {
      console.warn(
        `${PREFIX} endSpan op=${op} name="${name}" duration=${Date.now() - start}ms ERROR`,
      );
      throw err;
    }
  },
};
