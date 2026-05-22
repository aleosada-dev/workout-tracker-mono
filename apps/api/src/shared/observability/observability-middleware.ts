import * as Sentry from "@sentry/hono/cloudflare";
import { createMiddleware } from "hono/factory";
import { routePath } from "hono/route";
import type { AppBindings } from "../http/types";
import { isObservabilityEnabled, isSentryEnabled } from "./config";
import { sanitize, sanitizeHeaders } from "./sanitize";

const MAX_BODY_BYTES = 8 * 1024;
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const readBody = async (
	source: Request | Response,
	contentType: string | null,
): Promise<unknown> => {
	try {
		const lengthHeader = source.headers.get("content-length");
		if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
			return "[BodyTooLarge]";
		}
		const text = await source.clone().text();
		if (!text) return undefined;
		if (text.length > MAX_BODY_BYTES) {
			return "[BodyTooLarge]";
		}
		if (contentType?.includes("application/json")) {
			try {
				return sanitize(JSON.parse(text));
			} catch {
				return text;
			}
		}
		return text;
	} catch {
		return "[BodyReadError]";
	}
};

export const observabilityMiddleware = createMiddleware<AppBindings>(async (c, next) => {
	if (!isObservabilityEnabled(c.env)) {
		await next();
		return;
	}

	const method = c.req.method;
	const path = c.req.path;
	const route = routePath(c, -1);
	const startTime = Date.now();
	const sentryEnabled = isSentryEnabled(c.env);

	if (sentryEnabled) {
		Sentry.setTag("http.method", method);
		Sentry.setTag("route", route);
	}

	const requestData: Record<string, unknown> = {
		method,
		path,
		route,
		query: sanitize(c.req.query()),
		headers: sanitizeHeaders(c.req.raw.headers),
	};

	if (METHODS_WITH_BODY.has(method)) {
		requestData.body = await readBody(c.req.raw, c.req.raw.headers.get("content-type"));
	}

	if (sentryEnabled) {
		Sentry.addBreadcrumb({
			category: "http.request",
			level: "info",
			message: `${method} ${path}`,
			data: requestData,
		});
	} else {
		// Stringify so nested data (validation issues, video metadata) is not
		// collapsed to `[Object]` by the console's depth limit.
		console.log(`[http.request] ${method} ${path}`, JSON.stringify(requestData, null, 2));
	}

	await next();

	const durationMs = Date.now() - startTime;
	const status = c.res.status;

	const responseData: Record<string, unknown> = {
		status,
		durationMs,
	};

	if (c.res.body) {
		responseData.body = await readBody(c.res, c.res.headers.get("content-type"));
	}

	if (sentryEnabled) {
		Sentry.addBreadcrumb({
			category: "http.response",
			level: status >= 500 ? "error" : status >= 400 ? "warning" : "info",
			message: `${status} ${method} ${path}`,
			data: responseData,
		});
	} else {
		console.log(
			`[http.response] ${status} ${method} ${path} ${durationMs}ms`,
			JSON.stringify(responseData, null, 2),
		);
	}
});
