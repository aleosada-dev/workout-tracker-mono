import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import { EquipmentListResponseSchema, toEquipmentResponse } from "./schemas";

export const equipmentsRouter = new Hono<AppBindings>().get(
	"/",
	describeRoute({
		summary: "List all equipments",
		tags: ["Equipments"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": {
						schema: resolver(EquipmentListResponseSchema),
					},
				},
			},
			401: { description: "Unauthorized" },
		},
	}),
	async (c) => {
		const { list } = c.get("container").equipments;
		const equipments = await list();
		return c.json(equipments.map(toEquipmentResponse));
	},
);
