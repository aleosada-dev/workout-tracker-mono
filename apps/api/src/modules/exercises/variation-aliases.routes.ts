import { NotFoundError } from "@workout-tracker/domain";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	CreateVariationAliasRequestSchema,
	DeleteVariationAliasRequestSchema,
	DeleteVariationAliasResponseSchema,
	ListVariationAliasesQuerySchema,
	toVariationAliasResponse,
	UpdateVariationAliasRequestSchema,
	VariationAliasIdParamSchema,
	VariationAliasListResponseSchema,
	VariationAliasResponseSchema,
} from "./variation-aliases.schemas";

export const variationAliasesRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "List equipment aliases for one or more variations",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(VariationAliasListResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListVariationAliasesQuerySchema),
		async (c) => {
			const { variationIds, userId: queryUserId } = c.req.valid("query");
			const userId = queryUserId ?? c.get("userId");
			const { listVariationAliases } = c.get("container").exercises;
			const aliases = await listVariationAliases({ userId, variationIds });
			return c.json(aliases.map(toVariationAliasResponse));
		},
	)
	.post(
		"/",
		describeRoute({
			summary: "Create an equipment alias for a variation",
			tags: ["Exercises"],
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": {
							schema: resolver(VariationAliasResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				409: { description: "Variation alias already exists" },
			},
		}),
		validator("json", CreateVariationAliasRequestSchema),
		async (c) => {
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { createVariationAlias } = c.get("container").exercises;
			const alias = await createVariationAlias({ userId, ...body });
			return c.json(toVariationAliasResponse(alias), 201);
		},
	)
	.patch(
		"/:id",
		describeRoute({
			summary: "Update an equipment alias (rename / set location)",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(VariationAliasResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Variation alias not found" },
				409: { description: "Variation alias already exists" },
			},
		}),
		validator("param", VariationAliasIdParamSchema),
		validator("json", UpdateVariationAliasRequestSchema),
		async (c) => {
			const { id: aliasId } = c.req.valid("param");
			const { userId: bodyUserId, ...body } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { updateVariationAlias } = c.get("container").exercises;
			const alias = await updateVariationAlias({ userId, aliasId, ...body });
			if (!alias) {
				throw new NotFoundError("variation alias");
			}
			return c.json(toVariationAliasResponse(alias));
		},
	)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete an equipment alias",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(DeleteVariationAliasResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				404: { description: "Variation alias not found" },
			},
		}),
		validator("param", VariationAliasIdParamSchema),
		validator("json", DeleteVariationAliasRequestSchema),
		async (c) => {
			const { id: aliasId } = c.req.valid("param");
			const { userId: bodyUserId } = c.req.valid("json");
			const userId = bodyUserId ?? c.get("userId");
			const { deleteVariationAlias } = c.get("container").exercises;
			const { deleted } = await deleteVariationAlias({ userId, aliasId });
			if (!deleted) {
				throw new NotFoundError("variation alias");
			}
			return c.json({ id: aliasId });
		},
	);
