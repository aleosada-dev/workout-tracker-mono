import type { Profile } from "@workout-tracker/domain";
import { z } from "zod";

export const ProfileResponseSchema = z.object({
	id: z.uuid(),
	role: z.enum(["coach", "athlete"]),
	fullName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
});

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;

export function toProfileResponse(profile: Profile): ProfileResponse {
	return {
		id: profile.id,
		role: profile.role,
		fullName: profile.fullName,
		avatarUrl: profile.avatarUrl,
	};
}
