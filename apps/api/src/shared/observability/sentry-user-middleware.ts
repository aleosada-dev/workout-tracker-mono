import * as Sentry from "@sentry/hono/cloudflare";
import { createMiddleware } from "hono/factory";
import type { AppBindings } from "../http/types";
import { isSentryEnabled } from "./config";

export const sentryUserMiddleware = createMiddleware<AppBindings>(async (c, next) => {
	if (!isSentryEnabled(c.env)) {
		await next();
		return;
	}

	const claims = c.get("userClaims");

	if (claims) {
		Sentry.setUser({ id: claims.sub });
	}

	await next();
});
