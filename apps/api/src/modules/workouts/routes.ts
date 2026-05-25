import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	ListWorkoutFoldersQuerySchema,
	toWorkoutFolderResponse,
	WorkoutFolderListResponseSchema,
} from "./schemas";

export const workoutsRouter = new Hono<AppBindings>().get(
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
);
