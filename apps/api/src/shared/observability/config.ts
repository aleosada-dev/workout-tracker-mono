import type { Env } from "../../env";

type ObservabilityEnv = Pick<Env, "SENTRY_DSN" | "SENTRY_ENVIRONMENT">;

export function isObservabilityEnabled(env: ObservabilityEnv): boolean {
	return env.SENTRY_ENVIRONMENT !== "test";
}

export function isSentryEnabled(env: ObservabilityEnv): boolean {
	return isObservabilityEnabled(env) && !!env.SENTRY_DSN;
}
