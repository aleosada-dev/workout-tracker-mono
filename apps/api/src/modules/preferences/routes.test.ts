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
				weightUnit: "kg",
				countWarmupSets: false,
				autoStartRestTimer: true,
				loadRounding: "none",
				defaultTrainingLocationId: null,
				autoFillReps: true,
				defaultSetsCount: 1,
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
			weightUnit: "kg",
			countWarmupSets: false,
			autoStartRestTimer: true,
			loadRounding: "none",
			defaultTrainingLocationId: null,
			autoFillReps: true,
			defaultSetsCount: 1,
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
			{ json: { weightUnit: "lb" } },
			{ headers: authHeaders("athlete") },
		);

		const body = await res.json();
		expect(body.defaultRestSeconds).toBe(90);
		expect(body.weightUnit).toBe("lb");
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

	test("persists the load rounding mode", async () => {
		const client = getTestClient();

		const res = await client.api.v1.preferences.$patch(
			{ json: { loadRounding: "2.5" } },
			{ headers: authHeaders("athlete") },
		);

		expect((await res.json()).loadRounding).toBe("2.5");
	});

	test("rejects an invalid load rounding mode with 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$patch(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ json: { loadRounding: "3" as any } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("persists and resets the default training location", async () => {
		const client = getTestClient();
		const locationId = "11111111-1111-4111-8111-111111111111";

		const setRes = await client.api.v1.preferences.$patch(
			{ json: { defaultTrainingLocationId: locationId } },
			{ headers: authHeaders("athlete") },
		);
		expect((await setRes.json()).defaultTrainingLocationId).toBe(locationId);

		const resetRes = await client.api.v1.preferences.$patch(
			{ json: { defaultTrainingLocationId: null } },
			{ headers: authHeaders("athlete") },
		);
		expect((await resetRes.json()).defaultTrainingLocationId).toBeNull();
	});

	test("rejects a non-uuid default training location with 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$patch(
			{ json: { defaultTrainingLocationId: "not-a-uuid" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("rejects an invalid weight unit with 400", async () => {
		const client = getTestClient();
		const res = await client.api.v1.preferences.$patch(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ json: { weightUnit: "oz" as any } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});
});
