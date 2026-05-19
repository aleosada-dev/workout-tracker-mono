import { describe, expect, test } from "bun:test";
import { authHeaders } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { MuscleResponse } from "./schemas";

const SEED_MUSCLE_SUPERIORES_ID = "a2166200-55e9-4ba9-acfc-f57f08dc4423";
const SEED_MUSCLE_PEITO_ID = "dc2d2b99-eff0-4a81-b949-c23e6cf61b75";
const SEED_MUSCLE_PEITORAL_MAIOR_ID = "e92d6c4c-8cec-4871-99e0-899b693c59d2";

describe("GET /api/v1/muscles", () => {
	test("no query params returns a flat list (default mode)", async () => {
		const client = getTestClient();
		const res = await client.api.v1.muscles.$get(
			{ query: {} },
			{ headers: authHeaders("athlete") },
		);

		const data = (await res.json()) as MuscleResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.length).toBeGreaterThan(0);
		expect(data.every((m) => m.children === undefined)).toBeTrue();

		const sample = data.find((m) => m.id === SEED_MUSCLE_PEITO_ID);
		expect(sample).toMatchObject({
			id: SEED_MUSCLE_PEITO_ID,
			name: expect.any(String),
			slug: expect.any(String),
			parentId: SEED_MUSCLE_SUPERIORES_ID,
			level: 2,
			sortOrder: expect.any(Number),
			createdAt: expect.any(String),
		});
	});

	test("mode=flat matches the default response", async () => {
		const client = getTestClient();
		const res = await client.api.v1.muscles.$get(
			{ query: { mode: "flat" } },
			{ headers: authHeaders("athlete") },
		);

		const data = (await res.json()) as MuscleResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.length).toBeGreaterThan(0);
		expect(data.every((m) => m.children === undefined)).toBeTrue();
		expect(data.some((m) => m.id === SEED_MUSCLE_PEITORAL_MAIOR_ID)).toBeTrue();
	});

	test("mode=nested returns level-1 roots with children populated", async () => {
		const client = getTestClient();
		const res = await client.api.v1.muscles.$get(
			{ query: { mode: "nested" } },
			{ headers: authHeaders("athlete") },
		);

		const data = (await res.json()) as MuscleResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.every((m) => m.level === 1)).toBeTrue();
		expect(data.every((m) => m.parentId === null)).toBeTrue();

		const superiores = data.find((m) => m.id === SEED_MUSCLE_SUPERIORES_ID);
		expect(superiores).toBeDefined();
		expect(superiores?.children).toBeArray();
		expect(superiores?.children?.length).toBeGreaterThan(0);
		expect(superiores?.children?.every((m) => m.level === 2)).toBeTrue();

		const peito = superiores?.children?.find((m) => m.id === SEED_MUSCLE_PEITO_ID);
		expect(peito).toBeDefined();
		expect(peito?.parentId).toBe(SEED_MUSCLE_SUPERIORES_ID);
		expect(peito?.children).toBeArray();
		expect(peito?.children?.some((m) => m.id === SEED_MUSCLE_PEITORAL_MAIOR_ID)).toBeTrue();

		const peitoralMaior = peito?.children?.find((m) => m.id === SEED_MUSCLE_PEITORAL_MAIOR_ID);
		expect(peitoralMaior?.level).toBe(3);
		expect(peitoralMaior?.parentId).toBe(SEED_MUSCLE_PEITO_ID);
		expect(peitoralMaior?.children).toEqual([]);
	});

	test("invalid mode value returns 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.muscles.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ query: { mode: "banana" as any } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.muscles.$get({ query: {} });

		expect(res.status).toBe(401);
	});
});
