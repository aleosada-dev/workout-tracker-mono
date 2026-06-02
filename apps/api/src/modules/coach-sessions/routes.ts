import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { AppBindings } from "../../shared/http/types";
import { CoachSessionListResponseSchema, toCoachSessionResponse } from "./schemas";

const CoachSessionsQuerySchema = z.object({
	athleteId: z.uuid(),
	date: z.iso.date(),
});

export const coachSessionsRouter = new Hono<AppBindings>().get(
	"/",
	describeRoute({
		summary: "List scheduled coach sessions for an athlete on a date",
		tags: ["Coach Sessions"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": { schema: resolver(CoachSessionListResponseSchema) },
				},
			},
			401: { description: "Unauthorized" },
		},
	}),
	validator("query", CoachSessionsQuerySchema),
	async (c) => {
		const requesterId = c.get("userId");
		const { athleteId, date } = c.req.valid("query");
		const { listScheduledSessions } = c.get("container").coachSessions;
		const sessions = await listScheduledSessions(requesterId, athleteId, date);
		return c.json(sessions.map(toCoachSessionResponse));
	},
);
