import { ForbiddenError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { AppBindings } from "../../shared/http/types";
import { CoachAthleteListResponseSchema, toCoachAthleteResponse } from "./schemas";

const IdParamSchema = z.object({ id: z.uuid() });

export const coachesRouter = new Hono<AppBindings>().get(
	"/:id/athletes",
	describeRoute({
		summary: "List athletes linked to a coach",
		tags: ["Coaches"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": { schema: resolver(CoachAthleteListResponseSchema) },
				},
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
		},
	}),
	validator("param", IdParamSchema),
	async (c) => {
		const requesterId = c.get("userId");
		const { id } = c.req.valid("param");
		if (id !== requesterId) {
			throw new ForbiddenError("Not allowed to list these athletes");
		}
		const { listAthletes } = c.get("container").coaches;
		const athletes = await listAthletes(id);
		return c.json(athletes.map(toCoachAthleteResponse));
	},
);
