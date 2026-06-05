import { afterEach, describe, expect, test } from "bun:test";
import { authHeaders } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { TrainingLocationResponse } from "../training-locations/schemas";
import type { ExerciseListItemResponse } from "./schemas";
import type { VariationAliasResponse } from "./variation-aliases.schemas";

const client = getTestClient();
const aliases = client.api.v1.exercises["variation-aliases"];
const locations = client.api.v1["training-locations"];

const createdAliasIds = new Set<string>();
const createdLocationIds = new Set<string>();

afterEach(async () => {
	for (const id of createdAliasIds) {
		await aliases[":id"].$delete({ param: { id }, json: {} }, { headers: authHeaders("athlete") });
	}
	for (const id of createdLocationIds) {
		await locations[":id"].$delete(
			{ param: { id }, json: {} },
			{ headers: authHeaders("athlete") },
		);
	}
	createdAliasIds.clear();
	createdLocationIds.clear();
});

async function anAthleteVariationId(): Promise<string> {
	const res = await client.api.v1.exercises.$get(
		{ query: { visibility: "all" } },
		{ headers: authHeaders("athlete") },
	);
	const exercises = (await res.json()) as ExerciseListItemResponse[];
	const id = exercises.flatMap((e) => e.variations.map((v) => v.id))[0];
	if (!id) throw new Error("no variation available for the athlete");
	return id;
}

async function createAlias(
	variationId: string,
	name: string,
	locationId: string | null = null,
): Promise<VariationAliasResponse> {
	const res = await aliases.$post(
		{ json: { variationId, name, locationId } },
		{ headers: authHeaders("athlete") },
	);
	expect(res.status).toBe(201);
	const alias = (await res.json()) as VariationAliasResponse;
	createdAliasIds.add(alias.id);
	return alias;
}

describe("exercises/variation-aliases CRUD", () => {
	test("creates an alias and lists it by variation", async () => {
		const variationId = await anAthleteVariationId();
		const created = await createAlias(variationId, "Leg Press Azul");
		expect(created.variationId).toBe(variationId);
		expect(created.locationId).toBeNull();

		const res = await aliases.$get(
			{ query: { variationIds: [variationId] } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status).toBe(200);
		const data = (await res.json()) as VariationAliasResponse[];
		expect(data.some((a) => a.id === created.id)).toBeTrue();
	});

	test("updates an alias to attach a location", async () => {
		const variationId = await anAthleteVariationId();
		const created = await createAlias(variationId, "Leg Press Preto");

		const locRes = await locations.$post(
			{ json: { name: "Academia Norte" } },
			{ headers: authHeaders("athlete") },
		);
		const location = (await locRes.json()) as TrainingLocationResponse;
		createdLocationIds.add(location.id);

		const res = await aliases[":id"].$patch(
			{ param: { id: created.id }, json: { locationId: location.id } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status).toBe(200);
		const updated = (await res.json()) as VariationAliasResponse;
		expect(updated.locationId).toBe(location.id);
	});

	test("rejects a duplicate active name within the same variation", async () => {
		const variationId = await anAthleteVariationId();
		await createAlias(variationId, "Máquina Repetida");
		const res = await aliases.$post(
			{ json: { variationId, name: "Máquina Repetida", locationId: null } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(409);
	});

	test("soft-deletes an alias so it no longer lists", async () => {
		const variationId = await anAthleteVariationId();
		const created = await createAlias(variationId, "Para Remover");
		createdAliasIds.delete(created.id);

		const del = await aliases[":id"].$delete(
			{ param: { id: created.id }, json: {} },
			{ headers: authHeaders("athlete") },
		);
		expect(del.status).toBe(200);

		const res = await aliases.$get(
			{ query: { variationIds: [variationId] } },
			{ headers: authHeaders("athlete") },
		);
		const data = (await res.json()) as VariationAliasResponse[];
		expect(data.some((a) => a.id === created.id)).toBeFalse();
	});
});
