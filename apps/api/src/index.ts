import * as Sentry from "@sentry/hono/cloudflare";
import { sentry } from "@sentry/hono/cloudflare";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@workout-tracker/domain";
import { Hono } from "hono";
import { buildContainer } from "./container";
import { coachesRouter } from "./modules/coaches/routes";
import { equipmentsRouter } from "./modules/equipments/routes";
import { exercisesRouter } from "./modules/exercises/routes";
import { mediasRouter } from "./modules/medias/routes";
import { musclesRouter } from "./modules/muscles/routes";
import { preferencesRouter } from "./modules/preferences/routes";
import { profilesRouter } from "./modules/profiles/routes";
import { workoutLogsRouter } from "./modules/workout-logs/routes";
import { workoutsRouter } from "./modules/workouts/routes";
import { bearerAuthMiddleware } from "./shared/http/auth-middleware";
import { buildOpenApiSpec, registerOpenApiRoutes } from "./shared/http/openapi";
import type { AppBindings } from "./shared/http/types";
import { isDevelopment, isSentryEnabled } from "./shared/observability/config";
import { formatError } from "./shared/observability/log-error";
import { observabilityMiddleware } from "./shared/observability/observability-middleware";
import { sentryUserMiddleware } from "./shared/observability/sentry-user-middleware";

const apiApp = new Hono<AppBindings>()
	.use("*", observabilityMiddleware)
	.use("*", bearerAuthMiddleware)
	.use("*", sentryUserMiddleware)
	.use("*", async (c, next) => {
		c.set("container", buildContainer(c.env, c.get("accessToken")));
		await next();
	})
	.route("/muscles", musclesRouter)
	.route("/exercises", exercisesRouter)
	.route("/medias", mediasRouter)
	.route("/equipments", equipmentsRouter)
	.route("/workouts", workoutsRouter)
	.route("/workout-logs", workoutLogsRouter)
	.route("/profiles", profilesRouter)
	.route("/coachs", coachesRouter)
	.route("/preferences", preferencesRouter);

const openApiSpec = await buildOpenApiSpec(apiApp, "/api/v1");

const baseApp = new Hono<AppBindings>();
const sentryMiddleware = sentry(baseApp, (env) => ({
	dsn: env.SENTRY_DSN,
	environment: env.SENTRY_ENVIRONMENT ?? "development",
	sendDefaultPii: false,
	tracesSampleRate: env.SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
	enableLogs: true,
}));

const app = baseApp
	.onError((err, c) => {
		// Expected domain outcomes — control flow, not failures. The request log
		// from observabilityMiddleware already records the resulting status.
		if (err instanceof NotFoundError) {
			return c.json({ error: err.message }, 404);
		}

		if (err instanceof ConflictError) {
			return c.json({ error: err.message }, 409);
		}

		if (err instanceof ForbiddenError) {
			return c.json({ error: err.message }, 403);
		}

		if (err instanceof ValidationError) {
			return c.json({ error: err.message, issues: err.issues }, 400);
		}

		// Unhandled error → 500. Always print it in full (message, stack and the
		// whole `cause` chain, e.g. a wrapped Supabase RPC error) so it is visible
		// in `wrangler dev`. Forward to Sentry only when a DSN is configured.
		console.error(`[unhandled] ${formatError(err)}`);

		if (isSentryEnabled(c.env)) {
			Sentry.captureException(err);
		}

		// Outside production, return the real error so it shows up in the client
		// and the network inspector instead of an opaque "Internal Server Error".
		if (isDevelopment(c.env)) {
			return c.json(
				{
					error: "Internal Server Error",
					message: err instanceof Error ? err.message : String(err),
				},
				500,
			);
		}

		return c.text("Internal Server Error", 500);
	})
	.use("/api/v1/*", async (c, next) => {
		if (!isSentryEnabled(c.env)) {
			await next();
			return;
		}

		return sentryMiddleware(c, next);
	})
	.route("/api/v1", apiApp);

registerOpenApiRoutes(app, openApiSpec);

export type AppType = typeof app;

export default app;
