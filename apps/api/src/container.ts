import {
	makeCoachApp,
	makeEquipmentApp,
	makeExerciseApp,
	makeMuscleApp,
	makeProfileApp,
	makeUserPreferencesApp,
	makeWorkoutApp,
	makeWorkoutLogApp,
} from "@workout-tracker/application";
import {
	createSupabaseClient,
	makeBuildUploadedVideoUrl,
	makeBuildVideoUploadUrls,
	makeHeadObject,
	makeSupabaseCoachRepository,
	makeSupabaseEquipmentRepository,
	makeSupabaseExerciseRepository,
	makeSupabaseMuscleRepository,
	makeSupabaseProfileRepository,
	makeSupabaseUserPreferencesRepository,
	makeSupabaseWorkoutFolderRepository,
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
	const workoutFolderRepository = makeSupabaseWorkoutFolderRepository(supabase);
	const workoutRepository = makeSupabaseWorkoutRepository(supabase);
	const profileRepository = makeSupabaseProfileRepository(supabase);
	const coachRepository = makeSupabaseCoachRepository(supabase);
	const userPreferencesRepository = makeSupabaseUserPreferencesRepository(supabase);

	return {
		muscles: makeMuscleApp(muscleRepository),
		exercises: makeExerciseApp(exerciseRepository),
		equipments: makeEquipmentApp(equipmentRepository),
		workouts: makeWorkoutApp(workoutFolderRepository, workoutRepository),
		workoutLogs: makeWorkoutLogApp(workoutLogRepository),
		profile: makeProfileApp(profileRepository),
		coaches: makeCoachApp(coachRepository),
		userPreferences: makeUserPreferencesApp(userPreferencesRepository),
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
