import { describe, expect, test } from "bun:test";
import { authHeaders } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { EquipmentResponse } from "./schemas";

const SEED_EQUIPMENT_BARRA = "d8377917-ef47-4a1d-973b-b15d0ead755c";
const SEED_EQUIPMENT_HALTERES = "bf6e017e-f787-4ca5-8457-c4a9a35d7c4d";

describe("GET /api/v1/equipments", () => {
	test("returns a non-empty list with the expected shape", async () => {
		const client = getTestClient();
		const res = await client.api.v1.equipments.$get(undefined, {
			headers: authHeaders("athlete"),
		});

		const data = (await res.json()) as EquipmentResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.length).toBeGreaterThan(0);

		const sample = data[0];
		expect(sample).toMatchObject({
			id: expect.any(String),
			name: expect.any(String),
			slug: expect.any(String),
			preposition: expect.any(String),
			createdAt: expect.any(String),
		});
	});

	test("includes seeded equipments (barra, halteres)", async () => {
		const client = getTestClient();
		const res = await client.api.v1.equipments.$get(undefined, {
			headers: authHeaders("athlete"),
		});

		const data = (await res.json()) as EquipmentResponse[];
		const ids = data.map((e) => e.id);

		expect(res.status).toBe(200);
		expect(ids).toContain(SEED_EQUIPMENT_BARRA);
		expect(ids).toContain(SEED_EQUIPMENT_HALTERES);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.equipments.$get(undefined);

		expect(res.status).toBe(401);
	});
});
