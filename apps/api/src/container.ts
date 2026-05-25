import {
	makeEquipmentApp,
	makeExerciseApp,
	makeMuscleApp,
	makeWorkoutApp,
	makeWorkoutLogApp,
} from "@workout-tracker/application";
import {
	createSupabaseClient,
	makeBuildUploadedVideoUrl,
	makeBuildVideoUploadUrls,
	makeHeadObject,
	makeSupabaseEquipmentRepository,
	makeSupabaseExerciseRepository,
	makeSupabaseMuscleRepository,
	makeSupabaseWorkoutLogRepository,
	makeSupabaseWorkoutRepository,
} from "@workout-tracker/infrastructure";
import type { Env } from "./env";

export function buildContainer(env: Env, accessToken?: string) {
	const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_KEY, accessToken);
	const muscleRepository = makeSupabaseMuscleRepository(supabase);
	const exerciseRepository = makeSupabaseExerciseRepository(supabase, {
		buildUploadedVideoUrl: makeBuildUploadedVideoUrl(env),
	});
	const equipmentRepository = makeSupabaseEquipmentRepository(supabase);
	const workoutLogRepository = makeSupabaseWorkoutLogRepository(supabase);
	const workoutRepository = makeSupabaseWorkoutRepository(supabase);

	return {
		muscles: makeMuscleApp(muscleRepository),
		exercises: makeExerciseApp(exerciseRepository),
		equipments: makeEquipmentApp(equipmentRepository),
		workouts: makeWorkoutApp(workoutRepository),
		workoutLogs: makeWorkoutLogApp(workoutLogRepository),
		videoUploads: {
			buildUploadUrls: makeBuildVideoUploadUrls(env),
			headObject: makeHeadObject(env),
		},
	};
}

export type Container = ReturnType<typeof buildContainer>;
export type MuscleModule = Container["muscles"];
export type ExerciseModule = Container["exercises"];
export type EquipmentModule = Container["equipments"];
export type WorkoutModule = Container["workouts"];
export type WorkoutLogModule = Container["workoutLogs"];
