import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	OccurrenceIdParamSchema,
	OccurrenceListResponseSchema,
	OccurrenceResponseSchema,
	OccurrencesQuerySchema,
	OccurrenceWorkoutParamSchema,
	OccurrenceWorkoutQuerySchema,
	OccurrenceWorkoutResponseSchema,
	toOccurrenceResponse,
	toOccurrenceWorkoutResponse,
	UpdateOccurrenceStatusRequestSchema,
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
			const authUserId = c.get("userId");

			const { userId: queryUserId, date, status } = c.req.valid("query");
			const athleteId = queryUserId ?? authUserId;
			const { listOccurrences } = c.get("container").periodizations;
			const occurrences = await listOccurrences({ athleteId, date, status });
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
		validator("query", OccurrenceWorkoutQuerySchema),
		async (c) => {
			const authUserId = c.get("userId");
			const { occurrenceId } = c.req.valid("param");
			const { userId: queryUserId } = c.req.valid("query");
			const athleteId = queryUserId ?? authUserId;
			const { getOccurrenceWorkout } = c.get("container").periodizations;
			const result = await getOccurrenceWorkout({ occurrenceId, athleteId });
			return c.json(toOccurrenceWorkoutResponse(result));
		},
	)
	.patch(
		"/occurrences/:id",
		describeRoute({
			summary: "Update the status of a periodization occurrence",
			tags: ["Periodizations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(OccurrenceResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Occurrence not found" },
			},
		}),
		validator("param", OccurrenceIdParamSchema),
		validator("json", UpdateOccurrenceStatusRequestSchema),
		async (c) => {
			const { id: occurrenceId } = c.req.valid("param");
			const { status, skippedReason } = c.req.valid("json");
			const { updateOccurrenceStatus } = c.get("container").periodizations;
			const occurrence = await updateOccurrenceStatus({ occurrenceId, status, skippedReason });
			return c.json(toOccurrenceResponse(occurrence));
		},
	);
