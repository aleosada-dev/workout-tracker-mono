import {
	LOAD_ROUNDING_MODES,
	type PreferencesPatch,
	type UserPreferences,
} from "@workout-tracker/domain";
import { z } from "zod";

export const UserPreferencesResponseSchema = z.object({
	defaultRestSeconds: z.number().int().nonnegative().nullable(),
	weightUnit: z.enum(["kg", "lb"]),
	countWarmupSets: z.boolean(),
	autoStartRestTimer: z.boolean(),
	loadRounding: z.enum(LOAD_ROUNDING_MODES),
});

export type UserPreferencesResponse = z.infer<typeof UserPreferencesResponseSchema>;

// Every field is optional (partial update). A `null` value resets the
// preference back to its default; only `defaultRestSeconds` actually accepts
// null as a meaningful stored state, the booleans/enum reset by being omitted.
export const UpdateUserPreferencesRequestSchema = z
	.object({
		defaultRestSeconds: z.number().int().nonnegative().nullable(),
		weightUnit: z.enum(["kg", "lb"]),
		countWarmupSets: z.boolean(),
		autoStartRestTimer: z.boolean(),
		loadRounding: z.enum(LOAD_ROUNDING_MODES),
	})
	.partial();

export type UpdateUserPreferencesRequest = z.infer<typeof UpdateUserPreferencesRequestSchema>;

export function toUserPreferencesResponse(preferences: UserPreferences): UserPreferencesResponse {
	return {
		defaultRestSeconds: preferences.defaultRestSeconds,
		weightUnit: preferences.weightUnit,
		countWarmupSets: preferences.countWarmupSets,
		autoStartRestTimer: preferences.autoStartRestTimer,
		loadRounding: preferences.loadRounding,
	};
}

export function toPreferencesPatch(body: UpdateUserPreferencesRequest): PreferencesPatch {
	return body;
}
