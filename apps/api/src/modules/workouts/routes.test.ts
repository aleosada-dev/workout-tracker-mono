import { describe, expect, test } from "bun:test";
import { authHeaders, getTestUserAuth } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { WorkoutFolderResponse, WorkoutResponse } from "./schemas";

const SEED_FOLDER_HIPERTROFIA = "1a111111-aaaa-4aaa-aaaa-000000000001";
const SEED_FOLDER_FORCA = "2a222222-bbbb-4bbb-bbbb-000000000002";
const SEED_WORKOUT_A_ROOT = "52f2bbe7-0c3f-4728-b7c9-34a2223cf0b8";
const SEED_WORKOUT_B_HIPER = "d94823aa-e98d-4516-9088-eee775693846";
const EXPECTED_WORKOUT_COUNTS_BY_FOLDER_ID = new Map([
	[SEED_FOLDER_HIPERTROFIA, 2],
	[SEED_FOLDER_FORCA, 1],
]);

describe("GET /api/v1/workouts/folders", () => {
	test("returns workout folders for the requested user", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.folders.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("athlete") },
		);

		const data = (await res.json()) as WorkoutFolderResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.length).toBeGreaterThanOrEqual(2);
		expect(data.every((folder) => folder.userId === athleteId)).toBeTrue();

		const ids = data.map((folder) => folder.id);
		expect(ids).toContain(SEED_FOLDER_HIPERTROFIA);
		expect(ids).toContain(SEED_FOLDER_FORCA);

		for (const [folderId, workoutCount] of EXPECTED_WORKOUT_COUNTS_BY_FOLDER_ID) {
			const folder = data.find((item) => item.id === folderId);
			expect(folder?.workoutCount).toBe(workoutCount);
		}

		const sample = data[0];
		expect(sample).toMatchObject({
			id: expect.any(String),
			userId: athleteId,
			name: expect.any(String),
			color: expect.any(String),
			workoutCount: expect.any(Number),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	test("allows a coach to request folders for an athlete", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.folders.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("coach") },
		);

		const data = (await res.json()) as WorkoutFolderResponse[];

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(data.some((folder) => folder.id === SEED_FOLDER_HIPERTROFIA)).toBeTrue();
		expect(data.every((folder) => folder.userId === athleteId)).toBeTrue();
		expect(data.find((folder) => folder.id === SEED_FOLDER_HIPERTROFIA)?.workoutCount).toBe(2);
	});

	test("returns 400 when userId is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ query: {} as any },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("returns 400 when userId is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ query: { userId: "not-a-uuid" as any } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.folders.$get({ query: { userId: athleteId } });

		expect(res.status).toBe(401);
	});
});

describe("GET /api/v1/workouts", () => {
	test("returns active workouts for the requested user, sorted by name", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];
		expect(data).toBeArray();

		const ids = data.map((w) => w.id);
		expect(ids).toContain(SEED_WORKOUT_A_ROOT);
		expect(ids).toContain(SEED_WORKOUT_B_HIPER);

		expect(data.every((w) => w.userId === athleteId)).toBeTrue();

		const sample = data.find((w) => w.id === SEED_WORKOUT_A_ROOT);
		if (!sample) throw new Error("expected SEED_WORKOUT_A_ROOT in response");
		expect(sample).toMatchObject({
			id: SEED_WORKOUT_A_ROOT,
			userId: athleteId,
			folderId: null,
			folderName: null,
		});
		expect(typeof sample.name).toBe("string");
		expect(Array.isArray(sample.muscleSlugs)).toBeTrue();
		expect(sample.exerciseCount).toBeGreaterThan(0);
		expect(sample.muscleSlugs.length).toBeGreaterThan(0);
	});

	test("returns only root workouts when folderId is 'null'", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId, folderId: "null" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];
		expect(data.length).toBeGreaterThan(0);
		expect(data.every((w) => w.folderId === null)).toBeTrue();
		const ids = data.map((w) => w.id);
		expect(ids).toContain(SEED_WORKOUT_A_ROOT);
		expect(ids).not.toContain(SEED_WORKOUT_B_HIPER);
	});

	test("filters by folderId", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId, folderId: SEED_FOLDER_HIPERTROFIA } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];
		expect(data.every((w) => w.folderId === SEED_FOLDER_HIPERTROFIA)).toBeTrue();
		expect(data.every((w) => w.folderName === "Hipertrofia")).toBeTrue();
		const ids = data.map((w) => w.id);
		expect(ids).toContain(SEED_WORKOUT_B_HIPER);
		expect(ids).not.toContain(SEED_WORKOUT_A_ROOT);
	});

	test("returns 400 when userId is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ query: {} as any },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get({ query: { userId: athleteId } });
		expect(res.status).toBe(401);
	});
});

describe("POST /api/v1/workouts/folders", () => {
	test("creates a folder for the authenticated user", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const name = `T-${Date.now().toString(36)}`;

		const res = await client.api.v1.workouts.folders.$post(
			{ json: { name, color: "purple" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(201);
		const folder = (await res.json()) as WorkoutFolderResponse;
		expect(folder).toMatchObject({
			id: expect.any(String),
			userId: athleteId,
			name,
			color: "purple",
			workoutCount: 0,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	test("returns 409 when a folder with the same name already exists", async () => {
		const client = getTestClient();
		const name = `D-${Date.now().toString(36)}`;

		const first = await client.api.v1.workouts.folders.$post(
			{ json: { name, color: "blue" } },
			{ headers: authHeaders("athlete") },
		);
		expect(first.status).toBe(201);

		const second = await client.api.v1.workouts.folders.$post(
			{ json: { name, color: "blue" } },
			{ headers: authHeaders("athlete") },
		);
		expect(second.status as number).toBe(409);
	});

	test("returns 400 when name is empty", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders.$post(
			{ json: { name: "", color: "blue" } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 400 when color is not allowed", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders.$post(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ json: { name: "x", color: "neon" as any } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders.$post({
			json: { name: "x", color: "blue" },
		});
		expect(res.status as number).toBe(401);
	});
});
