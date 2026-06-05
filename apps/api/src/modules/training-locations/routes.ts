import { NotFoundError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	CreateTrainingLocationRequestSchema,
	DeleteTrainingLocationRequestSchema,
	DeleteTrainingLocationResponseSchema,
	ListTrainingLocationsQuerySchema,
	TrainingLocationIdParamSchema,
	TrainingLocationListResponseSchema,
	TrainingLocationResponseSchema,
	toTrainingLocationResponse,
	UpdateTrainingLocationRequestSchema,
} from "./schemas";

export const trainingLocationsRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "List the athlete's training locations",
			tags: ["Training Locations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(TrainingLocationListResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListTrainingLocationsQuerySchema),
		async (c) => {
			const { userId: queryUserId } = c.req.valid("query");
			const userId = queryUserId ?? c.get("userId");
			const { list } = c.get("container").trainingLocations;
			const locations = await list({ userId });
			return c.json(locations.map(toTrainingLocationResponse));
		},
	)
	.post(
		"/",
		describeRoute({
			summary: "Create a training location",
			tags: ["Training Locations"],
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": {
							schema: resolver(TrainingLocationResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				409: { description: "Training location already exists" },
			},
		}),
		validator("json", CreateTrainingLocationRequestSchema),
		async (c) => {
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { create } = c.get("container").trainingLocations;
			const location = await create({ userId, ...body });
			return c.json(toTrainingLocationResponse(location), 201);
		},
	)
	.patch(
		"/:id",
		describeRoute({
			summary: "Rename a training location",
			tags: ["Training Locations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(TrainingLocationResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Training location not found" },
				409: { description: "Training location already exists" },
			},
		}),
		validator("param", TrainingLocationIdParamSchema),
		validator("json", UpdateTrainingLocationRequestSchema),
		async (c) => {
			const { id: locationId } = c.req.valid("param");
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { update } = c.get("container").trainingLocations;
			const location = await update({ userId, locationId, ...body });
			if (!location) {
				throw new NotFoundError("training location");
			}
			return c.json(toTrainingLocationResponse(location));
		},
	)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete a training location",
			tags: ["Training Locations"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteTrainingLocationResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Training location not found" },
			},
		}),
		validator("param", TrainingLocationIdParamSchema),
		validator("json", DeleteTrainingLocationRequestSchema),
		async (c) => {
			const { id: locationId } = c.req.valid("param");
			const { userId: bodyUserId } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { delete: deleteLocation } = c.get("container").trainingLocations;
			const { deleted } = await deleteLocation({ userId, locationId });
			if (!deleted) {
				throw new NotFoundError("training location");
			}
			return c.json({ id: locationId });
		},
	);
