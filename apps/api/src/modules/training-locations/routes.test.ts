import { afterEach, describe, expect, test } from "bun:test";
import { authHeaders, getTestUserAuth } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { TrainingLocationResponse } from "./schemas";

const locations = getTestClient().api.v1["training-locations"];
const createdIds = new Set<string>();

async function deleteLocation(id: string, profile: "athlete" | "coach" = "athlete") {
	await locations[":id"].$delete({ param: { id }, json: {} }, { headers: authHeaders(profile) });
}

afterEach(async () => {
	for (const id of createdIds) {
		await deleteLocation(id);
	}
	createdIds.clear();
});

async function createLocation(name: string): Promise<TrainingLocationResponse> {
	const res = await locations.$post({ json: { name } }, { headers: authHeaders("athlete") });
	expect(res.status).toBe(201);
	const location = (await res.json()) as TrainingLocationResponse;
	createdIds.add(location.id);
	return location;
}

describe("training locations CRUD", () => {
	test("creates a location and lists it for the owner", async () => {
		const athleteId = getTestUserAuth("athlete").userId;
		const created = await createLocation("Smith Gym Centro");
		expect(created.userId).toBe(athleteId);

		const res = await locations.$get({ query: {} }, { headers: authHeaders("athlete") });
		expect(res.status).toBe(200);
		const data = (await res.json()) as TrainingLocationResponse[];
		expect(data.some((l) => l.id === created.id && l.name === "Smith Gym Centro")).toBeTrue();
	});

	test("renames a location", async () => {
		const created = await createLocation("Nome Antigo");
		const res = await locations[":id"].$patch(
			{ param: { id: created.id }, json: { name: "Nome Novo" } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status).toBe(200);
		const updated = (await res.json()) as TrainingLocationResponse;
		expect(updated.name).toBe("Nome Novo");
	});

	test("rejects a duplicate active name for the same user", async () => {
		await createLocation("Local Repetido");
		const res = await locations.$post(
			{ json: { name: "Local Repetido" } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(409);
	});

	test("soft-deletes a location so it no longer lists", async () => {
		const created = await createLocation("Para Apagar");
		createdIds.delete(created.id);

		const del = await locations[":id"].$delete(
			{ param: { id: created.id }, json: {} },
			{ headers: authHeaders("athlete") },
		);
		expect(del.status).toBe(200);

		const res = await locations.$get({ query: {} }, { headers: authHeaders("athlete") });
		const data = (await res.json()) as TrainingLocationResponse[];
		expect(data.some((l) => l.id === created.id)).toBeFalse();
	});

	test("a coach manages a location on behalf of the athlete", async () => {
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await locations.$post(
			{ json: { userId: athleteId, name: "Local do Coach" } },
			{ headers: authHeaders("coach") },
		);
		expect(res.status).toBe(201);
		const created = (await res.json()) as TrainingLocationResponse;
		createdIds.add(created.id);
		expect(created.userId).toBe(athleteId);

		// athlete sees what the coach created
		const list = await locations.$get({ query: {} }, { headers: authHeaders("athlete") });
		const data = (await list.json()) as TrainingLocationResponse[];
		expect(data.some((l) => l.id === created.id)).toBeTrue();
	});
});
