import {
	type PreferencesPatch,
	ROUNDING_INCREMENTS,
	type UserPreferences,
} from "@workout-tracker/domain";
import { z } from "zod";

const WeightPreferenceSchema = z
	.object({
		unit: z.enum(["kg", "lb"]),
		rounding: z.number().positive().nullable(),
	})
	.refine((w) => w.rounding === null || ROUNDING_INCREMENTS[w.unit].includes(w.rounding), {
		message: "rounding must be a valid increment for the unit",
		path: ["rounding"],
	});

export const UserPreferencesResponseSchema = z.object({
	defaultRestSeconds: z.number().int().nonnegative().nullable(),
	weight: WeightPreferenceSchema,
	countWarmupSets: z.boolean(),
	autoStartRestTimer: z.boolean(),
});

export type UserPreferencesResponse = z.infer<typeof UserPreferencesResponseSchema>;

// Every field is optional (partial update). A `null` value resets the
// preference back to its default; only `defaultRestSeconds` actually accepts
// null as a meaningful stored state, the booleans reset by being omitted.
export const UpdateUserPreferencesRequestSchema = z
	.object({
		defaultRestSeconds: z.number().int().nonnegative().nullable(),
		weight: WeightPreferenceSchema,
		countWarmupSets: z.boolean(),
		autoStartRestTimer: z.boolean(),
	})
	.partial();

export type UpdateUserPreferencesRequest = z.infer<typeof UpdateUserPreferencesRequestSchema>;

export function toUserPreferencesResponse(preferences: UserPreferences): UserPreferencesResponse {
	return {
		defaultRestSeconds: preferences.defaultRestSeconds,
		weight: preferences.weight,
		countWarmupSets: preferences.countWarmupSets,
		autoStartRestTimer: preferences.autoStartRestTimer,
	};
}

export function toPreferencesPatch(body: UpdateUserPreferencesRequest): PreferencesPatch {
	return body;
}
