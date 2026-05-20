import * as Sentry from "@sentry/hono/cloudflare";
import { sentry } from "@sentry/hono/cloudflare";
import { ConflictError, NotFoundError, ValidationError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { buildContainer } from "./container";
import { equipmentsRouter } from "./modules/equipments/routes";
import { exercisesRouter } from "./modules/exercises/routes";
import { musclesRouter } from "./modules/muscles/routes";
import { workoutLogsRouter } from "./modules/workout-logs/routes";
import { bearerAuthMiddleware } from "./shared/http/auth-middleware";
import { buildOpenApiSpec, registerOpenApiRoutes } from "./shared/http/openapi";
import type { AppBindings } from "./shared/http/types";
import { isObservabilityEnabled } from "./shared/observability/config";
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
	.route("/equipments", equipmentsRouter)
	.route("/workout-logs", workoutLogsRouter);

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
		console.error(`[onError] ${err.name}: ${err.message}`);

		if (err instanceof NotFoundError) {
			return c.json({ error: err.message }, 404);
		}

		if (err instanceof ConflictError) {
			return c.json({ error: err.message }, 409);
		}

		if (err instanceof ValidationError) {
			return c.json({ error: err.message, issues: err.issues }, 400);
		}

		if (isObservabilityEnabled(c.env)) {
			Sentry.captureException(err);
			console.error(err);
		}

		return c.text("Internal Server Error", 500);
	})
	.use("/api/v1/*", async (c, next) => {
		if (!isObservabilityEnabled(c.env)) {
			await next();
			return;
		}

		return sentryMiddleware(c, next);
	})
	.route("/api/v1", apiApp);

registerOpenApiRoutes(app, openApiSpec);

export type AppType = typeof app;

export default app;
