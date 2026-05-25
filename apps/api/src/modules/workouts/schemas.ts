import type { WorkoutFolder } from "@workout-tracker/domain";
import { z } from "zod";

export const ListWorkoutFoldersQuerySchema = z.object({
	userId: z.uuid(),
});

export type ListWorkoutFoldersQuery = z.infer<typeof ListWorkoutFoldersQuerySchema>;

export const WorkoutFolderResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	name: z.string().trim().min(1),
	color: z.string().trim().min(1),
	workoutCount: z.int().nonnegative(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const WorkoutFolderListResponseSchema = z.array(WorkoutFolderResponseSchema);

export type WorkoutFolderResponse = z.infer<typeof WorkoutFolderResponseSchema>;

export function toWorkoutFolderResponse(folder: WorkoutFolder): WorkoutFolderResponse {
	return {
		id: folder.id,
		userId: folder.userId,
		name: folder.name,
		color: folder.color,
		workoutCount: folder.workoutCount,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt.toISOString(),
	};
}
