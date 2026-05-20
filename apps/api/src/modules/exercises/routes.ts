import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	CreateExerciseRequestSchema,
	CreateExerciseResponseSchema,
	ExerciseDetailResponseSchema,
	ExerciseIdParamSchema,
	ExerciseListResponseSchema,
	ListExercisesQuerySchema,
	toExerciseListItemResponse,
} from "./schemas";

export const exercisesRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "List exercises",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseListResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListExercisesQuerySchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const query = c.req.valid("query");
			const { list } = c.get("container").exercises;
			const exercises = await list({ ...query, userId });
			return c.json(exercises.map(toExerciseListItemResponse));
		},
	)
	.post(
		"/",
		describeRoute({
			summary: "Create exercise",
			tags: ["Exercises"],
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": {
							schema: resolver(CreateExerciseResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				409: { description: "Exercise variation already exists" },
			},
		}),
		validator("json", CreateExerciseRequestSchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const body = c.req.valid("json");
			const { createExercise } = c.get("container").exercises;
			const { id } = await createExercise({ userId, ...body });
			return c.json({ id }, 201);
		},
	)
	.get(
		"/:id/detail",
		describeRoute({
			summary: "Get exercise detail (sessions and records per variation)",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseDetailResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "Exercise variation not found" },
			},
		}),
		validator("param", ExerciseIdParamSchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const { id: variationId } = c.req.valid("param");
			const { getExerciseDetail } = c.get("container").exercises;
			const detail = await getExerciseDetail({ userId, variationId });
			return c.json(detail);
		},
	);
