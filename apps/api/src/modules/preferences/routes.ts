import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	toPreferencesPatch,
	toUserPreferencesResponse,
	UpdateUserPreferencesRequestSchema,
	UserPreferencesResponseSchema,
} from "./schemas";

export const preferencesRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "Get the authenticated user's preferences",
			tags: ["Preferences"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": { schema: resolver(UserPreferencesResponseSchema) },
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		async (c) => {
			const userId = c.get("userId");
			const preferences = await c.get("container").userPreferences.get(userId);
			return c.json(toUserPreferencesResponse(preferences));
		},
	)
	.patch(
		"/",
		describeRoute({
			summary: "Update the authenticated user's preferences",
			tags: ["Preferences"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": { schema: resolver(UserPreferencesResponseSchema) },
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("json", UpdateUserPreferencesRequestSchema),
		async (c) => {
			const userId = c.get("userId");
			const body = c.req.valid("json");
			const preferences = await c
				.get("container")
				.userPreferences.update(userId, toPreferencesPatch(body));
			return c.json(toUserPreferencesResponse(preferences));
		},
	);
