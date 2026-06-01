export { makeSupabaseCoachRepository } from './coaches/supabase-coach-adapter';
export { makeSupabaseEquipmentRepository } from './equipments/supabase-equipments-adapter';
export { makeSupabaseExerciseRepository } from './exercises/supabase-exercises-adapter';
export { makeSupabaseMuscleRepository } from './muscles/supabase-muscles-adapter';
export { makeSupabaseUserPreferencesRepository } from './preferences/supabase-user-preferences-adapter';
export { makeSupabaseProfileRepository } from './profiles/supabase-profile-adapter';
export type {
  BuildUploadedVideoUrl,
  BuildVideoUploadUrls,
  BuildVideoUploadUrlsInput,
  BuildVideoUploadUrlsResult,
  HeadObject,
  HeadObjectResult,
  R2Config,
  R2Env,
  VideoUploadTarget,
} from './r2';
export {
  headObject,
  makeBuildUploadedVideoUrl,
  makeBuildVideoUploadUrls,
  makeHeadObject,
  presignGetHourSnapped,
  presignPut,
  readR2Config,
} from './r2';
export { createSupabaseClient, type Supabase } from './supabase/client';
export { supabaseError } from './supabase/supabase-error';
export type { Database, Json } from './supabase/types';
export { makeSupabaseWorkoutLogRepository } from './workout-logs/supabase-workout-logs-adapter';
export { makeSupabaseWorkoutRepository } from './workouts/supabase-workouts-adapter';
export { makeSupabaseWorkoutFolderRepository } from './workouts/supabase-workouts-folder-adapter';
