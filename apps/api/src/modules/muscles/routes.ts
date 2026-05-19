import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	MuscleListResponseSchema,
	MusclesQuerySchema,
	toMuscleResponse,
	toMuscleTreeResponse,
} from "./schemas";

export const musclesRouter = new Hono<AppBindings>().get(
	"/",
	describeRoute({
		summary: "List all muscles",
		tags: ["Muscles"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": {
						schema: resolver(MuscleListResponseSchema),
					},
				},
			},
			401: { description: "Unauthorized" },
		},
	}),
	validator("query", MusclesQuerySchema),
	async (c) => {
		const { mode } = c.req.valid("query");
		const { list, tree } = c.get("container").muscles;

		if (mode === "nested") {
			const roots = await tree();
			return c.json(roots.map(toMuscleTreeResponse));
		}

		const muscles = await list();
		return c.json(muscles.map(toMuscleResponse));
	},
);
