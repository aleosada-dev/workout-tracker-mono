import type { Env } from "../../env";

type ObservabilityEnv = Pick<Env, "SENTRY_DSN" | "SENTRY_ENVIRONMENT">;

export function isObservabilityEnabled(env: ObservabilityEnv): boolean {
	return env.SENTRY_ENVIRONMENT !== "test";
}

export function isSentryEnabled(env: ObservabilityEnv): boolean {
	return isObservabilityEnabled(env) && !!env.SENTRY_DSN;
}

/**
 * True for everything that is not the deployed production environment — local
 * `wrangler dev` and tests. Gates verbose, leaky behaviour such as returning
 * the real error message in HTTP responses.
 */
export function isDevelopment(env: ObservabilityEnv): boolean {
	return env.SENTRY_ENVIRONMENT !== "production";
}
