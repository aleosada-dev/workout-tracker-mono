import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	CreateWorkoutFolderRequestSchema,
	ListWorkoutFoldersQuerySchema,
	toWorkoutFolderResponse,
	WorkoutFolderListResponseSchema,
	WorkoutFolderResponseSchema,
} from "./schemas";

export const workoutsRouter = new Hono<AppBindings>()
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
			const { userId } = c.req.valid("query");
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
			const userId = c.get("userId");
			const body = c.req.valid("json");
			const { createFolder } = c.get("container").workouts;
			const folder = await createFolder({ userId, ...body });
			return c.json(toWorkoutFolderResponse(folder), 201);
		},
	);
