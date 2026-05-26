import { ForbiddenError, NotFoundError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { z } from "zod";
import type { AppBindings } from "../../shared/http/types";
import { ProfileResponseSchema, toProfileResponse } from "./schemas";

const IdParamSchema = z.object({ id: z.uuid() });

export const profilesRouter = new Hono<AppBindings>().get(
	"/:id",
	describeRoute({
		summary: "Get a user profile by id",
		tags: ["Profiles"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": { schema: resolver(ProfileResponseSchema) },
				},
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
			404: { description: "Profile not found" },
		},
	}),
	validator("param", IdParamSchema),
	async (c) => {
		const requesterId = c.get("userId");
		const { id } = c.req.valid("param");
		if (id !== requesterId) {
			throw new ForbiddenError("Not allowed to access this profile");
		}
		const { getById } = c.get("container").profile;
		const profile = await getById(id);
		if (!profile) {
			throw new NotFoundError("profile");
		}
		return c.json(toProfileResponse(profile));
	},
);
