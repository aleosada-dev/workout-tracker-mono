import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { authHeaders } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";

// The athlete test user is shared across runs, so each test restores the
// preferences back to their default values for isolation.
async function resetPreferences() {
	const client = getTestClient();
	await client.api.v1.preferences.$patch(
		{
			json: {
				defaultRestSeconds: null,
				weight: { unit: "kg", rounding: null },
				countWarmupSets: false,
				autoStartRestTimer: true,
			},
		},
		{ headers: authHeaders("athlete") },
	);
}

describe("GET /api/v1/preferences", () => {
	beforeEach(async () => {
		await resetPreferences();
	});

	afterAll(async () => {
		await resetPreferences();
	});

	test("returns defaults when the user has no stored preferences", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$get({}, { headers: authHeaders("athlete") });

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			defaultRestSeconds: null,
			weight: { unit: "kg", rounding: null },
			countWarmupSets: false,
			autoStartRestTimer: true,
		});
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$get({});

		expect(res.status).toBe(401);
	});
});

describe("PATCH /api/v1/preferences", () => {
	beforeEach(async () => {
		await resetPreferences();
	});

	afterAll(async () => {
		await resetPreferences();
	});

	test("persists a preference and reflects it on the next read", async () => {
		const client = getTestClient();

		const patchRes = await client.api.v1.preferences.$patch(
			{ json: { countWarmupSets: true } },
			{ headers: authHeaders("athlete") },
		);

		expect(patchRes.status).toBe(200);
		expect((await patchRes.json()).countWarmupSets).toBe(true);

		const getRes = await client.api.v1.preferences.$get({}, { headers: authHeaders("athlete") });
		expect((await getRes.json()).countWarmupSets).toBe(true);
	});

	test("a partial update does not clobber previously set preferences", async () => {
		const client = getTestClient();

		await client.api.v1.preferences.$patch(
			{ json: { defaultRestSeconds: 90 } },
			{ headers: authHeaders("athlete") },
		);
		const res = await client.api.v1.preferences.$patch(
			{ json: { weight: { unit: "lb", rounding: 5 } } },
			{ headers: authHeaders("athlete") },
		);

		const body = await res.json();
		expect(body.defaultRestSeconds).toBe(90);
		expect(body.weight).toEqual({ unit: "lb", rounding: 5 });
	});

	test("a null defaultRestSeconds resets it back to the default", async () => {
		const client = getTestClient();

		await client.api.v1.preferences.$patch(
			{ json: { defaultRestSeconds: 120 } },
			{ headers: authHeaders("athlete") },
		);
		const res = await client.api.v1.preferences.$patch(
			{ json: { defaultRestSeconds: null } },
			{ headers: authHeaders("athlete") },
		);

		expect((await res.json()).defaultRestSeconds).toBeNull();
	});

	test("persists the weight preference with a rounding increment", async () => {
		const client = getTestClient();

		const res = await client.api.v1.preferences.$patch(
			{ json: { weight: { unit: "kg", rounding: 2.5 } } },
			{ headers: authHeaders("athlete") },
		);

		expect((await res.json()).weight).toEqual({ unit: "kg", rounding: 2.5 });
	});

	test("rejects a rounding increment invalid for the unit with 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$patch(
			{ json: { weight: { unit: "kg", rounding: 5 } } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("rejects an invalid weight unit with 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$patch(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ json: { weight: { unit: "oz", rounding: 1 } as any } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});
});
