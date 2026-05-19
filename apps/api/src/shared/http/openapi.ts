import { Scalar } from "@scalar/hono-api-reference";
import type { Env, Hono } from "hono";
import { generateSpecs } from "hono-openapi";

const DOCUMENTATION = {
	info: {
		title: "Workout Tracker API",
		version: "1.0.0",
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
	},
} as const;

export type OpenApiSpec = Awaited<ReturnType<typeof generateSpecs>>;

export async function buildOpenApiSpec<E extends Env>(
	source: Hono<E>,
	prefix = "",
): Promise<OpenApiSpec> {
	const spec = await generateSpecs(source, { documentation: DOCUMENTATION });
	if (!prefix) return spec;
	return {
		...spec,
		paths: Object.fromEntries(
			Object.entries(spec.paths ?? {}).map(([path, def]) => [`${prefix}${path}`, def]),
		),
	};
}

export function registerOpenApiRoutes<E extends Env>(target: Hono<E>, spec: OpenApiSpec): void {
	target.get("/openapi.json", (c) => c.json(spec));
	target.get("/scalar", Scalar({ url: "/openapi.json", pageTitle: DOCUMENTATION.info.title }));
}
