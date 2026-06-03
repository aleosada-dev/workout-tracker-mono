import {
	makeCoachApp,
	makeCoachSessionApp,
	makeEquipmentApp,
	makeExerciseApp,
	makeMuscleApp,
	makePeriodizationApp,
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
	makeSupabaseCoachSessionRepository,
	makeSupabaseEquipmentRepository,
	makeSupabaseExerciseRepository,
	makeSupabaseMuscleRepository,
	makeSupabaseNotificationRepository,
	makeSupabasePeriodizationAdjustmentRepository,
	makeSupabasePeriodizationOccurrenceRepository,
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
	const coachSessionRepository = makeSupabaseCoachSessionRepository(supabase);
	const notificationRepository = makeSupabaseNotificationRepository(supabase);
	const userPreferencesRepository = makeSupabaseUserPreferencesRepository(supabase);
	const periodizationOccurrenceRepository = makeSupabasePeriodizationOccurrenceRepository(supabase);
	const periodizationAdjustmentRepository = makeSupabasePeriodizationAdjustmentRepository(supabase);

	return {
		muscles: makeMuscleApp(muscleRepository),
		exercises: makeExerciseApp(exerciseRepository),
		equipments: makeEquipmentApp(equipmentRepository),
		workouts: makeWorkoutApp(workoutFolderRepository, workoutRepository),
		workoutLogs: makeWorkoutLogApp(workoutLogRepository, notificationRepository),
		profile: makeProfileApp(profileRepository),
		coaches: makeCoachApp(coachRepository),
		coachSessions: makeCoachSessionApp(coachSessionRepository),
		userPreferences: makeUserPreferencesApp(userPreferencesRepository),
		periodizations: makePeriodizationApp(
			periodizationOccurrenceRepository,
			periodizationAdjustmentRepository,
			workoutRepository,
		),
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
