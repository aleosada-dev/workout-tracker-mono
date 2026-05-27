import { NotFoundError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	CreateWorkoutFolderRequestSchema,
	DeleteWorkoutFolderRequestSchema,
	DeleteWorkoutFolderResponseSchema,
	DeleteWorkoutQuerySchema,
	DeleteWorkoutResponseSchema,
	DeleteWorkoutsRequestSchema,
	DeleteWorkoutsResponseSchema,
	ListWorkoutFoldersQuerySchema,
	ListWorkoutsQuerySchema,
	MoveWorkoutsRequestSchema,
	MoveWorkoutsResponseSchema,
	toWorkoutFolderResponse,
	toWorkoutResponse,
	UpdateWorkoutFolderRequestSchema,
	WorkoutFolderIdParamSchema,
	WorkoutFolderListResponseSchema,
	WorkoutFolderResponseSchema,
	WorkoutIdParamSchema,
	WorkoutListResponseSchema,
} from "./schemas";

export const workoutsRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "List workouts for a user",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(WorkoutListResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListWorkoutsQuerySchema),
		async (c) => {
			const { userId: queryUserId, folderId } = c.req.valid("query");
			const userId = queryUserId ?? c.get("userId");
			const { listWorkouts } = c.get("container").workouts;
			const workouts = await listWorkouts({ userId, folderId });
			return c.json(workouts.map(toWorkoutResponse));
		},
	)
	.get(
		"/folders",
		describeRoute({
			summary: "List workout folders for a user",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(WorkoutFolderListResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListWorkoutFoldersQuerySchema),
		async (c) => {
			const { userId: queryUserId } = c.req.valid("query");
			const userId = queryUserId ?? c.get("userId");
			const { listFolders } = c.get("container").workouts;
			const folders = await listFolders({ userId });
			return c.json(folders.map(toWorkoutFolderResponse));
		},
	)
	.post(
		"/folders",
		describeRoute({
			summary: "Create a workout folder",
			tags: ["Workouts"],
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": {
							schema: resolver(WorkoutFolderResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				409: { description: "Workout folder already exists" },
			},
		}),
		validator("json", CreateWorkoutFolderRequestSchema),
		async (c) => {
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { createFolder } = c.get("container").workouts;
			const folder = await createFolder({ userId, ...body });
			return c.json(toWorkoutFolderResponse(folder), 201);
		},
	)
	.patch(
		"/folders/:id",
		describeRoute({
			summary: "Update a workout folder",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(WorkoutFolderResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Workout folder not found" },
				409: { description: "Workout folder already exists" },
			},
		}),
		validator("param", WorkoutFolderIdParamSchema),
		validator("json", UpdateWorkoutFolderRequestSchema),
		async (c) => {
			const { id: folderId } = c.req.valid("param");
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { updateFolder } = c.get("container").workouts;
			const folder = await updateFolder({ userId, folderId, ...body });
			if (!folder) {
				throw new NotFoundError("workout folder");
			}
			return c.json(toWorkoutFolderResponse(folder));
		},
	)
	.delete(
		"/folders/:id",
		describeRoute({
			summary: "Delete a workout folder",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteWorkoutFolderResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Workout folder not found" },
			},
		}),
		validator("param", WorkoutFolderIdParamSchema),
		validator("json", DeleteWorkoutFolderRequestSchema),
		async (c) => {
			const { id: folderId } = c.req.valid("param");
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { deleteFolder } = c.get("container").workouts;
			const { deleted } = await deleteFolder({ userId, folderId, ...body });
			if (!deleted) {
				throw new NotFoundError("workout folder");
			}
			return c.json({ id: folderId });
		},
	)
	.delete(
		"/:id",
		describeRoute({
			summary: "Soft-delete a workout",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteWorkoutResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Workout not found" },
			},
		}),
		validator("param", WorkoutIdParamSchema),
		validator("query", DeleteWorkoutQuerySchema),
		async (c) => {
			const { id: workoutId } = c.req.valid("param");
			const { userId: queryUserId } = c.req.valid("query");
			const userId = queryUserId ?? c.get("userId");
			const { deleteWorkouts } = c.get("container").workouts;
			const { deletedIds } = await deleteWorkouts({ userId, workoutIds: [workoutId] });
			if (!deletedIds.includes(workoutId)) {
				throw new NotFoundError("workout");
			}
			return c.json({ id: workoutId });
		},
	)
	.delete(
		"/",
		describeRoute({
			summary: "Soft-delete multiple workouts",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteWorkoutsResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("json", DeleteWorkoutsRequestSchema),
		async (c) => {
			const { userId: bodyUserId, workoutIds } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { deleteWorkouts } = c.get("container").workouts;
			const { deletedIds } = await deleteWorkouts({ userId, workoutIds });
			return c.json({ deletedIds });
		},
	)
	.patch(
		"/",
		describeRoute({
			summary: "Move workouts to another folder",
			tags: ["Workouts"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(MoveWorkoutsResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("json", MoveWorkoutsRequestSchema),
		async (c) => {
			const { userId: bodyUserId, workoutIds, targetFolderId } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { moveWorkouts } = c.get("container").workouts;
			const { movedIds } = await moveWorkouts({ userId, workoutIds, targetFolderId });
			return c.json({ movedIds });
		},
	);
