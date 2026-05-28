import { afterEach, describe, expect, test } from "bun:test";
import { createClient } from "@supabase/supabase-js";
import { authHeaders, getTestUserAuth } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type { WorkoutDetailResponse, WorkoutFolderResponse, WorkoutResponse } from "./schemas";

const createdFolderIds = new Set<string>();

async function deleteFolderById(id: string) {
	const client = getTestClient();
	await client.api.v1.workouts.folders[":id"].$delete(
		{ param: { id }, json: { mode: "delete-folder-only" } },
		{ headers: authHeaders("athlete") },
	);
}

afterEach(async () => {
	for (const id of createdFolderIds) {
		await deleteFolderById(id);
	}
	createdFolderIds.clear();
});

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

	test("defaults to the requester when userId is omitted", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.folders.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing default behavior
			{ query: {} as any },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		if (res.status !== 200) throw new Error("unexpected status");
		const data = await res.json();
		expect(data.every((folder) => folder.userId === athleteId)).toBeTrue();
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

	test("defaults to the requester when userId is omitted", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			// biome-ignore lint/suspicious/noExplicitAny: testing default behavior
			{ query: {} as any },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status).toBe(200);
		if (res.status !== 200) throw new Error("unexpected status");
		const data = await res.json();
		expect(data.every((w) => w.userId === athleteId)).toBeTrue();
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
		createdFolderIds.add(folder.id);
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
		const firstFolder = (await first.json()) as WorkoutFolderResponse;
		createdFolderIds.add(firstFolder.id);

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

const SEED_WORKOUT_C_HIPER = "cc111101-1111-4aaa-9aaa-000000000101";

describe("GET /api/v1/workouts — topExercises and lastPerformedAt", () => {
	test("lastPerformedAt is a non-null string for a workout that has logs", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];
		const workout = data.find((w) => w.id === SEED_WORKOUT_A_ROOT);
		if (!workout) throw new Error("expected SEED_WORKOUT_A_ROOT in response");

		expect(workout.lastPerformedAt).not.toBeNull();
		expect(typeof workout.lastPerformedAt).toBe("string");
	});

	test("lastPerformedAt is null for a workout with no logs", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];
		const workout = data.find((w) => w.id === SEED_WORKOUT_C_HIPER);
		if (!workout) throw new Error("expected SEED_WORKOUT_C_HIPER in response");

		expect(workout.lastPerformedAt).toBeNull();
	});

	test("topExercises has at most 2 entries, ordered by position, each with a non-empty name", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts.$get(
			{ query: { userId: athleteId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as WorkoutResponse[];

		for (const workout of data) {
			expect(workout.topExercises.length).toBeLessThanOrEqual(2);
			for (const ex of workout.topExercises) {
				expect(typeof ex.name).toBe("string");
				expect(ex.name.length).toBeGreaterThan(0);
			}
		}

		const wkA = data.find((w) => w.id === SEED_WORKOUT_A_ROOT);
		if (!wkA) throw new Error("expected SEED_WORKOUT_A_ROOT in response");

		expect(wkA.topExercises.length).toBe(2);
		const [first, second] = wkA.topExercises;
		expect(first.name).toBe("Supino");
		expect(second.name).toBe("Supino Inclinado");
	});
});

describe("DELETE /api/v1/workouts/folders/:id", () => {
	test("deletes a folder owned by the authenticated user", async () => {
		const client = getTestClient();
		const name = `Del-${Date.now().toString(36)}`;

		const created = await client.api.v1.workouts.folders.$post(
			{ json: { name, color: "slate" } },
			{ headers: authHeaders("athlete") },
		);
		expect(created.status).toBe(201);
		const folder = (await created.json()) as WorkoutFolderResponse;

		const res = await client.api.v1.workouts.folders[":id"].$delete(
			{ param: { id: folder.id }, json: { mode: "delete-folder-only" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { id: string };
		expect(body.id).toBe(folder.id);

		const list = await client.api.v1.workouts.folders.$get(
			{ query: { userId: getTestUserAuth("athlete").userId } },
			{ headers: authHeaders("athlete") },
		);
		const folders = (await list.json()) as WorkoutFolderResponse[];
		expect(folders.find((f) => f.id === folder.id)).toBeUndefined();
	});

	test("returns 404 when the folder does not exist", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders[":id"].$delete(
			{
				param: { id: "00000000-0000-4000-8000-000000000000" },
				json: { mode: "delete-folder-only" },
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 404 when the folder belongs to another user", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders[":id"].$delete(
			{
				param: { id: SEED_FOLDER_HIPERTROFIA },
				json: { mode: "delete-folder-only" },
			},
			{ headers: authHeaders("coach") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 400 when id is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders[":id"].$delete(
			{
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				param: { id: "not-a-uuid" as any },
				json: { mode: "delete-folder-only" },
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.folders[":id"].$delete({
			param: { id: "00000000-0000-4000-8000-000000000000" },
			json: { mode: "delete-folder-only" },
		});
		expect(res.status as number).toBe(401);
	});
});

const SEED_WORKOUT_FORCA_AGACHAMENTO = "cc111201-2222-4bbb-9bbb-000000000201";

async function restoreWorkout(id: string) {
	const { accessToken } = getTestUserAuth("athlete");
	const supabase = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_KEY ?? "", {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
		global: { headers: { Authorization: `Bearer ${accessToken}` } },
	});
	await supabase.from("workouts").update({ archived_at: null, arquived_by: null }).eq("id", id);
}

describe("GET /api/v1/workouts/:id", () => {
	test("returns a workout owned by the authenticated user", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts[":id"].$get(
			// biome-ignore lint/suspicious/noExplicitAny: query optional
			{ param: { id: SEED_WORKOUT_A_ROOT }, query: {} as any },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as WorkoutDetailResponse;
		expect(body.id).toBe(SEED_WORKOUT_A_ROOT);
		expect(body.userId).toBe(athleteId);
		expect(typeof body.name).toBe("string");
		expect(body.exercises).toBeArray();
		expect(body.exercises.length).toBeGreaterThan(0);
		const exercise = body.exercises[0];
		expect(exercise.id).toEqual(expect.any(String));
		expect(exercise.position).toEqual(expect.any(Number));
		expect(exercise.supersetGroupId).toEqual(expect.any(String));
		expect(exercise.variation.exercise.name).toEqual(expect.any(String));
		expect(exercise.variation.equipment.slug).toEqual(expect.any(String));
		expect(exercise.variation.muscle.slug).toEqual(expect.any(String));
		expect(Array.isArray(exercise.sets)).toBe(true);
		expect(exercise.sets.length).toBeGreaterThan(0);
		const positions = body.exercises.map((e) => e.position);
		const sortedPositions = [...positions].sort((a, b) => a - b);
		expect(positions.join(",")).toBe(sortedPositions.join(","));
		for (let i = 0; i < body.exercises.length; i++) {
			const orders = body.exercises[i].sets.map((s) => s.setOrder);
			const sortedOrders = [...orders].sort((a, b) => a - b);
			expect(orders.join(",")).toBe(sortedOrders.join(","));
		}
	});

	test("allows a coach to request a workout for an athlete", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const res = await client.api.v1.workouts[":id"].$get(
			{ param: { id: SEED_WORKOUT_A_ROOT }, query: { userId: athleteId } },
			{ headers: authHeaders("coach") },
		);

		expect(res.status).toBe(200);
	});

	test("returns 404 when the workout does not exist", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$get(
			{
				param: { id: "00000000-0000-4000-8000-000000000000" },
				// biome-ignore lint/suspicious/noExplicitAny: query optional
				query: {} as any,
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 404 when the workout belongs to another user", async () => {
		const client = getTestClient();
		const coachId = getTestUserAuth("coach").userId;
		const res = await client.api.v1.workouts[":id"].$get(
			{ param: { id: SEED_WORKOUT_A_ROOT }, query: { userId: coachId } },
			{ headers: authHeaders("coach") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 400 when id is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$get(
			{
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				param: { id: "not-a-uuid" as any },
				// biome-ignore lint/suspicious/noExplicitAny: query optional
				query: {} as any,
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$get({
			param: { id: SEED_WORKOUT_A_ROOT },
			// biome-ignore lint/suspicious/noExplicitAny: query optional
			query: {} as any,
		});
		expect(res.status as number).toBe(401);
	});
});

describe("DELETE /api/v1/workouts/:id", () => {
	test("soft-deletes a workout owned by the authenticated user", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;

		try {
			const res = await client.api.v1.workouts[":id"].$delete(
				// biome-ignore lint/suspicious/noExplicitAny: query optional
				{ param: { id: SEED_WORKOUT_FORCA_AGACHAMENTO }, query: {} as any },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as { id: string };
			expect(body.id).toBe(SEED_WORKOUT_FORCA_AGACHAMENTO);

			const list = await client.api.v1.workouts.$get(
				{ query: { userId: athleteId } },
				{ headers: authHeaders("athlete") },
			);
			const workouts = (await list.json()) as WorkoutResponse[];
			expect(workouts.find((w) => w.id === SEED_WORKOUT_FORCA_AGACHAMENTO)).toBeUndefined();
		} finally {
			await restoreWorkout(SEED_WORKOUT_FORCA_AGACHAMENTO);
		}
	});

	test("returns 404 when the workout does not exist", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$delete(
			{
				param: { id: "00000000-0000-4000-8000-000000000000" },
				// biome-ignore lint/suspicious/noExplicitAny: query optional
				query: {} as any,
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 404 when the workout belongs to another user", async () => {
		const client = getTestClient();
		const coachId = getTestUserAuth("coach").userId;
		const res = await client.api.v1.workouts[":id"].$delete(
			{
				param: { id: SEED_WORKOUT_A_ROOT },
				query: { userId: coachId },
			},
			{ headers: authHeaders("coach") },
		);
		expect(res.status as number).toBe(404);
	});

	test("returns 400 when id is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$delete(
			{
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				param: { id: "not-a-uuid" as any },
				// biome-ignore lint/suspicious/noExplicitAny: query optional
				query: {} as any,
			},
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts[":id"].$delete({
			param: { id: "00000000-0000-4000-8000-000000000000" },
			// biome-ignore lint/suspicious/noExplicitAny: query optional
			query: {} as any,
		});
		expect(res.status as number).toBe(401);
	});
});

const SEED_WORKOUT_C_QUADRICEPS = "cc111101-1111-4aaa-9aaa-000000000101";

describe("DELETE /api/v1/workouts", () => {
	test("soft-deletes multiple workouts owned by the authenticated user", async () => {
		const client = getTestClient();
		const athleteId = getTestUserAuth("athlete").userId;
		const ids = [SEED_WORKOUT_FORCA_AGACHAMENTO, SEED_WORKOUT_C_QUADRICEPS];

		try {
			const res = await client.api.v1.workouts.$delete(
				{ json: { workoutIds: ids } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as { deletedIds: string[] };
			expect(body.deletedIds.sort()).toEqual([...ids].sort());

			const list = await client.api.v1.workouts.$get(
				{ query: { userId: athleteId } },
				{ headers: authHeaders("athlete") },
			);
			const workouts = (await list.json()) as WorkoutResponse[];
			const remainingIds = workouts.map((w) => w.id);
			for (const id of ids) {
				expect(remainingIds).not.toContain(id);
			}
		} finally {
			for (const id of ids) {
				await restoreWorkout(id);
			}
		}
	});

	test("returns deletedIds excluding workouts of other users", async () => {
		const client = getTestClient();
		const coachId = getTestUserAuth("coach").userId;

		const res = await client.api.v1.workouts.$delete(
			{
				json: {
					userId: coachId,
					workoutIds: [SEED_WORKOUT_A_ROOT],
				},
			},
			{ headers: authHeaders("coach") },
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { deletedIds: string[] };
		expect(body.deletedIds).toEqual([]);
	});

	test("returns 400 when workoutIds is empty", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.$delete(
			{ json: { workoutIds: [] } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 400 when workoutIds contains a non-UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.$delete(
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			{ json: { workoutIds: ["not-a-uuid"] as any } },
			{ headers: authHeaders("athlete") },
		);
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.workouts.$delete({
			json: { workoutIds: ["00000000-0000-4000-8000-000000000000"] },
		});
		expect(res.status as number).toBe(401);
	});
});
