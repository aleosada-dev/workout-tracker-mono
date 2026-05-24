import { NotFoundError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { Container } from "../../container";
import type { AppBindings } from "../../shared/http/types";
import {
	CopyExercisesRequestSchema,
	CopyExercisesResponseSchema,
	type CreateExerciseRequest,
	CreateExerciseRequestSchema,
	CreateExerciseResponseSchema,
	DeleteExerciseResponseSchema,
	DeleteExercisesRequestSchema,
	DeleteExercisesResponseSchema,
	ExerciseDetailResponseSchema,
	ExerciseForEditResponseSchema,
	ExerciseIdParamSchema,
	ExerciseListResponseSchema,
	ExerciseNamesResponseSchema,
	ListExercisesQuerySchema,
	toExerciseListItemResponse,
	UpdateExerciseRequestSchema,
} from "./schemas";

/**
 * Validates a device video already uploaded to R2 before the exercise is
 * persisted. The R2 keys are client-supplied, so they cannot be trusted:
 * confirm they sit under this user's and variation's prefix, then HEAD the
 * object to confirm the upload actually landed and matches the declared size
 * and content type. Returns an error message, or `null` when the video is ok.
 */
async function validateUploadedVideo(
	video: NonNullable<CreateExerciseRequest["video"]>,
	userId: string,
	variationId: string,
	videoUploads: Container["videoUploads"],
): Promise<string | null> {
	const keyPrefix = `${userId}/${variationId}/`;
	if (!video.objectKey.startsWith(keyPrefix) || !video.thumbnailKey.startsWith(keyPrefix)) {
		return "Video keys do not match the authenticated user and variation";
	}

	const head = await videoUploads.headObject(video.objectKey);
	if (!head) {
		return "Uploaded video not found in storage";
	}
	if (head.contentLength !== video.sizeBytes || head.contentType !== video.contentType) {
		return "Uploaded video does not match the provided metadata";
	}

	return null;
}

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
			const userId = c.get("userId");
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
			const userId = c.get("userId");
			const body = c.req.valid("json");

			if (body.video) {
				const videoError = await validateUploadedVideo(
					body.video,
					userId,
					body.variationId,
					c.get("container").videoUploads,
				);
				if (videoError) {
					return c.json({ error: videoError }, 400);
				}
			}

			const { createExercise } = c.get("container").exercises;
			const { id } = await createExercise({ userId, ...body });
			return c.json({ id }, 201);
		},
	)
	.get(
		"/names",
		describeRoute({
			summary: "List exercise names (for autocomplete)",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseNamesResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		async (c) => {
			const userId = c.get("userId");
			const { listNames } = c.get("container").exercises;
			const names = await listNames({ userId });
			return c.json(names);
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
			const userId = c.get("userId");
			const { id: variationId } = c.req.valid("param");
			const { getExerciseDetail } = c.get("container").exercises;
			const detail = await getExerciseDetail({ userId, variationId });
			return c.json(detail);
		},
	)
	.get(
		"/:id",
		describeRoute({
			summary: "Get an exercise variation for editing",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseForEditResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "Exercise variation not found" },
			},
		}),
		validator("param", ExerciseIdParamSchema),
		async (c) => {
			const userId = c.get("userId");
			const { id: variationId } = c.req.valid("param");
			const { getExerciseForEdit } = c.get("container").exercises;
			const exercise = await getExerciseForEdit({ userId, variationId });
			return c.json(exercise);
		},
	)
	.put(
		"/:id",
		describeRoute({
			summary: "Update exercise",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(CreateExerciseResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Exercise variation not found" },
				409: { description: "Exercise variation already exists" },
			},
		}),
		validator("param", ExerciseIdParamSchema),
		validator("json", UpdateExerciseRequestSchema),
		async (c) => {
			const userId = c.get("userId");
			const { id: variationId } = c.req.valid("param");
			const body = c.req.valid("json");

			if (body.video) {
				const videoError = await validateUploadedVideo(
					body.video,
					userId,
					variationId,
					c.get("container").videoUploads,
				);
				if (videoError) {
					return c.json({ error: videoError }, 400);
				}
			}

			const { updateExercise } = c.get("container").exercises;
			const { id } = await updateExercise({ userId, variationId, ...body });
			return c.json({ id });
		},
	)
	.delete(
		"/",
		describeRoute({
			summary: "Delete exercises",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteExercisesResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("json", DeleteExercisesRequestSchema),
		async (c) => {
			const userId = c.get("userId");
			const { variationIds } = c.req.valid("json");
			const { deleteExercises } = c.get("container").exercises;
			const result = await deleteExercises({ userId, variationIds });
			return c.json(result);
		},
	)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete an exercise",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteExerciseResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Exercise variation not found" },
			},
		}),
		validator("param", ExerciseIdParamSchema),
		async (c) => {
			const userId = c.get("userId");
			const { id: variationId } = c.req.valid("param");
			const { deleteExercises } = c.get("container").exercises;
			const { deletedCount } = await deleteExercises({ userId, variationIds: [variationId] });
			if (deletedCount === 0) {
				throw new NotFoundError("variation");
			}
			return c.json({ id: variationId });
		},
	)
	.post(
		"/copy",
		describeRoute({
			summary: "Copy exercises into the user's library",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(CopyExercisesResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("json", CopyExercisesRequestSchema),
		async (c) => {
			const userId = c.get("userId");
			const { variationIds } = c.req.valid("json");
			const { copyExercises } = c.get("container").exercises;
			const result = await copyExercises({ userId, variationIds });
			return c.json(result);
		},
	);
