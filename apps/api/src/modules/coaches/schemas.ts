import type { CoachAthlete } from "@workout-tracker/domain";
import { z } from "zod";

export const CoachAthleteResponseSchema = z.object({
	athleteId: z.uuid(),
	fullName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
});

export const CoachAthleteListResponseSchema = z.array(CoachAthleteResponseSchema);

export type CoachAthleteResponse = z.infer<typeof CoachAthleteResponseSchema>;

export function toCoachAthleteResponse(athlete: CoachAthlete): CoachAthleteResponse {
	return {
		athleteId: athlete.athleteId,
		fullName: athlete.fullName,
		avatarUrl: athlete.avatarUrl,
	};
}
