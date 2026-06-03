import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	OccurrenceListResponseSchema,
	OccurrencesQuerySchema,
	OccurrenceWorkoutParamSchema,
	OccurrenceWorkoutResponseSchema,
	toOccurrenceResponse,
	toOccurrenceWorkoutResponse,
} from "./schemas";

export const periodizationsRouter = new Hono<AppBindings>()
	.get(
		"/occurrences",
		describeRoute({
			summary: "List pending periodization occurrences for the authenticated athlete on a date",
			tags: ["Periodizations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(OccurrenceListResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", OccurrencesQuerySchema),
		async (c) => {
			const userId = c.get("userId");

			const { date, status } = c.req.valid("query");
			const { listOccurrences } = c.get("container").periodizations;
			const occurrences = await listOccurrences({ athleteId: userId, date, status });
			return c.json(occurrences.map(toOccurrenceResponse));
		},
	)
	.get(
		"/occurrences/:occurrenceId/workout",
		describeRoute({
			summary: "Get the executable workout for an occurrence with periodization overrides applied",
			tags: ["Periodizations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(OccurrenceWorkoutResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "Occurrence or workout not found" },
			},
		}),
		validator("param", OccurrenceWorkoutParamSchema),
		async (c) => {
			const athleteId = c.get("userId");
			const { occurrenceId } = c.req.valid("param");
			const { getOccurrenceWorkout } = c.get("container").periodizations;
			const result = await getOccurrenceWorkout({ occurrenceId, athleteId });
			return c.json(toOccurrenceWorkoutResponse(result));
		},
	);
