import type { CoachSession } from "@workout-tracker/domain";
import { z } from "zod";

export const CoachSessionResponseSchema = z.object({
	id: z.uuid(),
	scheduledAt: z.iso.datetime({ offset: true }),
	durationMinutes: z.number().int(),
	coachFullName: z.string().nullable(),
	status: z.string(),
	notes: z.string().nullable(),
});

export const CoachSessionListResponseSchema = z.array(CoachSessionResponseSchema);

export type CoachSessionResponse = z.infer<typeof CoachSessionResponseSchema>;

export function toCoachSessionResponse(session: CoachSession): CoachSessionResponse {
	return {
		id: session.id,
		scheduledAt: session.scheduledAt,
		durationMinutes: session.durationMinutes,
		coachFullName: session.coachFullName,
		status: session.status,
		notes: session.notes,
	};
}
