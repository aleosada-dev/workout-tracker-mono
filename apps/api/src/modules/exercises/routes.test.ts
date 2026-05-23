import { describe, expect, test } from "bun:test";
import { authHeaders, getTestUserAuth } from "@/test/test-auth";
import { getTestClient } from "@/test/test-client";
import type {
	CreateExerciseRequest,
	ExerciseListItemResponse,
	ExerciseNameResponse,
} from "./schemas";

const SEED_MUSCLE_PEITO_ID = "dc2d2b99-eff0-4a81-b949-c23e6cf61b75";
const SEED_MUSCLE_PEITO_SLUG = "chest";
const SEED_MUSCLE_COSTAS_ID = "9de6361c-024f-4d83-ac13-5b42d3e9cd2b";
const SEED_MUSCLE_COSTAS_SLUG = "back";
const SEED_EQUIPMENT_BARRA = "d8377917-ef47-4a1d-973b-b15d0ead755c";
const SEED_EQUIPMENT_HALTERES = "bf6e017e-f787-4ca5-8457-c4a9a35d7c4d";
const PUBLIC_PREPARATORY_EXERCISES = [
	"Alongamento de Posterior",
	"Alongamento de Peitoral",
	"Mobilidade de Quadril",
	"Rotação de Ombros",
	"Corrida Estacionária",
];
const COACH_SHARED_EXERCISES = ["Burpee", "Mountain Climber", "Polichinelo"];

describe("GET /api/v1/exercises", () => {
	describe("valid query combinations", () => {
		test("no query params (visibility defaults to all)", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: {} },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];
			const athleteId = getTestUserAuth("athlete").userId;
			const coachId = getTestUserAuth("coach").userId;

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.some((e) => e.userId === null)).toBeTrue();
			expect(data.some((e) => e.userId === athleteId)).toBeTrue();
			expect(data.some((e) => e.userId === coachId)).toBeTrue();
		});

		test("visibility=all returns public, athlete's, and coach's exercises", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { visibility: "all" } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];
			const athleteId = getTestUserAuth("athlete").userId;
			const coachId = getTestUserAuth("coach").userId;

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.some((e) => e.userId === null)).toBeTrue();
			expect(data.some((e) => e.userId === athleteId)).toBeTrue();
			expect(data.some((e) => e.userId === coachId)).toBeTrue();
		});

		test("visibility=public returns only exercises with userId=null", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { visibility: "public" } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.userId === null)).toBeTrue();
		});

		test("public library includes preparatory warm-up and stretching exercises", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{
					query: {
						visibility: "public",
						exerciseTypes: ["preparatorio"],
					},
				},
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];
			const exerciseNames = data.map((e) => e.name);

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.userId === null)).toBeTrue();
			expect(data.every((e) => e.type === "preparatorio")).toBeTrue();
			for (const exerciseName of PUBLIC_PREPARATORY_EXERCISES) {
				expect(exerciseNames).toContain(exerciseName);
			}
		});

		test("visibility=private returns only exercises owned by the athlete or coach", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { visibility: "private" } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];
			const athleteId = getTestUserAuth("athlete").userId;
			const coachId = getTestUserAuth("coach").userId;

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.userId === athleteId || e.userId === coachId)).toBeTrue();
			expect(data.some((e) => e.userId === athleteId)).toBeTrue();
			expect(data.some((e) => e.userId === coachId)).toBeTrue();
		});

		test("athlete sees coach exercises shared via shared_variations", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { visibility: "private" } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];
			const coachId = getTestUserAuth("coach").userId;
			const coachExerciseNames = data.filter((e) => e.userId === coachId).map((e) => e.name);

			expect(res.status).toBe(200);
			for (const exerciseName of COACH_SHARED_EXERCISES) {
				expect(coachExerciseNames).toContain(exerciseName);
			}
		});

		test("exerciseTypes=[preparatorio] returns only preparatorio", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { exerciseTypes: ["preparatorio"] } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.type === "preparatorio")).toBeTrue();
		});

		test("exerciseTypes=[musculacao] returns only musculacao", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { exerciseTypes: ["musculacao"] } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.type === "musculacao")).toBeTrue();
		});

		test("exerciseTypes array returns only the listed types", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { exerciseTypes: ["preparatorio", "musculacao"] } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(data.every((e) => e.type === "preparatorio" || e.type === "musculacao")).toBeTrue();
			expect(data.some((e) => e.type === "preparatorio")).toBeTrue();
			expect(data.some((e) => e.type === "musculacao")).toBeTrue();
		});

		test("muscleIds with level-2 muscle expands to children (Peito)", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { muscleIds: [SEED_MUSCLE_PEITO_ID] } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(
				data.every((e) =>
					e.variations.every((v) => v.muscle.level2.slug === SEED_MUSCLE_PEITO_SLUG),
				),
			).toBeTrue();
		});

		test("muscleIds array expands each level-2 muscle to its children", async () => {
			const client = getTestClient();
			const muscleIds = [SEED_MUSCLE_PEITO_ID, SEED_MUSCLE_COSTAS_ID];
			const allowedLevel2Slugs = [SEED_MUSCLE_PEITO_SLUG, SEED_MUSCLE_COSTAS_SLUG];
			const res = await client.api.v1.exercises.$get(
				{ query: { muscleIds } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(
				data.every((e) =>
					e.variations.every((v) => allowedLevel2Slugs.includes(v.muscle.level2.slug)),
				),
			).toBeTrue();
			expect(
				data.some((e) => e.variations.some((v) => v.muscle.level2.slug === SEED_MUSCLE_PEITO_SLUG)),
			).toBeTrue();
			expect(
				data.some((e) =>
					e.variations.some((v) => v.muscle.level2.slug === SEED_MUSCLE_COSTAS_SLUG),
				),
			).toBeTrue();
		});

		test("equipmentIds with single UUID returns only that equipment", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { equipmentIds: [SEED_EQUIPMENT_BARRA] } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(
				data.every((e) => e.variations.every((v) => v.equipment.id === SEED_EQUIPMENT_BARRA)),
			).toBeTrue();
		});

		test("equipmentIds array returns only the listed equipment", async () => {
			const client = getTestClient();
			const equipmentIds = [SEED_EQUIPMENT_BARRA, SEED_EQUIPMENT_HALTERES];
			const res = await client.api.v1.exercises.$get(
				{ query: { equipmentIds } },
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(
				data.every((e) => e.variations.every((v) => equipmentIds.includes(v.equipment.id))),
			).toBeTrue();
			expect(
				data.some((e) => e.variations.some((v) => v.equipment.id === SEED_EQUIPMENT_BARRA)),
			).toBeTrue();
			expect(
				data.some((e) => e.variations.some((v) => v.equipment.id === SEED_EQUIPMENT_HALTERES)),
			).toBeTrue();
		});

		test("all filters combined apply intersection", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{
					query: {
						visibility: "public",
						muscleIds: [SEED_MUSCLE_PEITO_ID],
						equipmentIds: [SEED_EQUIPMENT_BARRA],
						exerciseTypes: ["musculacao"],
					},
				},
				{ headers: authHeaders("athlete") },
			);

			const data = (await res.json()) as ExerciseListItemResponse[];

			expect(res.status).toBe(200);
			expect(data).toBeArray();
			expect(
				data.every(
					(e) =>
						e.userId === null &&
						e.type === "musculacao" &&
						e.variations.every(
							(v) =>
								v.muscle.level2.slug === SEED_MUSCLE_PEITO_SLUG &&
								v.equipment.id === SEED_EQUIPMENT_BARRA,
						),
				),
			).toBeTrue();
		});
	});

	describe("invalid query combinations", () => {
		test("invalid visibility value returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				{ query: { visibility: "invalid" as any } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});

		test("invalid exerciseTypes value returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				{ query: { exerciseTypes: ["cardio"] as any } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});

		test("exerciseTypes with mix of valid and invalid values returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
				{ query: { exerciseTypes: ["preparatorio", "cardio"] as any } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});

		test("muscleIds with non-UUID value returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { muscleIds: ["not-a-uuid"] } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});

		test("muscleIds with mix of valid UUID and invalid value returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { muscleIds: [SEED_MUSCLE_PEITO_ID, "not-a-uuid"] } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});

		test("equipmentIds with non-UUID value returns 400", async () => {
			const client = getTestClient();
			const res = await client.api.v1.exercises.$get(
				{ query: { equipmentIds: ["not-a-uuid"] } },
				{ headers: authHeaders("athlete") },
			);

			expect(res.status).toBe(400);
		});
	});
});

describe("GET /api/v1/exercises/names", () => {
	test("returns one entry per visible exercise (own + public + coach-shared)", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.names.$get({}, { headers: authHeaders("athlete") });

		const data = (await res.json()) as ExerciseNameResponse[];
		const ids = data.map((e) => e.id);

		expect(res.status).toBe(200);
		expect(data).toBeArray();
		expect(new Set(ids).size).toBe(ids.length);
		for (const exerciseName of PUBLIC_PREPARATORY_EXERCISES) {
			expect(data.map((e) => e.name)).toContain(exerciseName);
		}
		for (const exerciseName of COACH_SHARED_EXERCISES) {
			expect(data.map((e) => e.name)).toContain(exerciseName);
		}
	});

	test("requires authentication", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.names.$get({});
		expect(res.status as number).toBe(401);
	});
});

// Unique exercise name and variation id per run so the RPC duplicate /
// collision checks do not break re-runs.
function newExerciseBody(): CreateExerciseRequest {
	return {
		variationId: crypto.randomUUID(),
		exerciseName: `Test Exercise ${crypto.randomUUID()}`,
		exerciseType: "musculacao",
		variationName: "Barra",
		muscleId: SEED_MUSCLE_PEITO_ID,
		secondaryMuscleId: null,
		equipmentId: SEED_EQUIPMENT_BARRA,
		youtubeVideoUrl: null,
		video: null,
	};
}

describe("POST /api/v1/exercises", () => {
	test("creates an exercise and returns the client-supplied variation id", async () => {
		const client = getTestClient();
		const body = newExerciseBody();

		const res = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(201);
		const data = (await res.json()) as { id: string };
		// The variation row uses the id minted by the client.
		expect(data.id).toBe(body.variationId);

		// The new exercise is persisted and owned by the creating user.
		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "private" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const created = list.find((e) => e.name === body.exerciseName);

		expect(created).toBeDefined();
		expect(created?.userId).toBe(getTestUserAuth("athlete").userId);
		expect(created?.variations.some((v) => v.id === body.variationId)).toBeTrue();
	});

	test("returns 400 when the video keys are not under the user's prefix", async () => {
		const client = getTestClient();
		const foreignId = "00000000-0000-4000-8000-000000000000";
		const res = await client.api.v1.exercises.$post(
			{
				json: {
					...newExerciseBody(),
					video: {
						objectKey: `${foreignId}/${foreignId}/${foreignId}.mp4`,
						thumbnailKey: `${foreignId}/${foreignId}/${foreignId}.jpg`,
						durationSeconds: 10,
						sizeBytes: 1024,
						contentType: "video/mp4",
					},
				},
			},
			{ headers: authHeaders("athlete") },
		);

		// The prefix check rejects the request before any storage call.
		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$post({ json: newExerciseBody() });

		// The auth middleware's 401 is a runtime response not modeled in the client type.
		expect(res.status as number).toBe(401);
	});

	test("returns 400 when exerciseName is empty", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$post(
			{ json: { ...newExerciseBody(), exerciseName: "" } },
			{ headers: authHeaders("athlete") },
		);

		// The validator's 400 is a runtime response not modeled in the client type.
		expect(res.status as number).toBe(400);
	});

	test("returns 400 when muscleId is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$post(
			{ json: { ...newExerciseBody(), muscleId: "not-a-uuid" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 409 when the same variation already exists", async () => {
		const client = getTestClient();
		// Re-posting with a fresh variation id but the same name/equipment/variation
		// still trips the duplicate check.
		const body = newExerciseBody();

		const first = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);
		expect(first.status).toBe(201);

		const second = await client.api.v1.exercises.$post(
			{ json: { ...body, variationId: crypto.randomUUID() } },
			{ headers: authHeaders("athlete") },
		);
		// The error handler's 409 is a runtime response not modeled in the client type.
		expect(second.status as number).toBe(409);
	});
});

describe("GET /api/v1/exercises/:id", () => {
	test("returns the exercise for editing when owned by the user", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		const created = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);
		expect(created.status).toBe(201);

		const res = await client.api.v1.exercises[":id"].$get(
			{ param: { id: body.variationId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toMatchObject({
			variationId: body.variationId,
			exerciseName: body.exerciseName,
			exerciseType: body.exerciseType,
			variationName: body.variationName,
			muscleId: body.muscleId,
			equipmentId: body.equipmentId,
			video: null,
		});
	});

	test("returns 404 for a variation the user does not own", async () => {
		const client = getTestClient();
		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "public" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const publicVariationId = list[0]?.variations[0]?.id;
		expect(publicVariationId).toBeDefined();

		const res = await client.api.v1.exercises[":id"].$get(
			{ param: { id: publicVariationId as string } },
			{ headers: authHeaders("athlete") },
		);

		// A public-library variation is not owned by the user — surfaces as 404.
		expect(res.status as number).toBe(404);
	});

	test("returns 400 when id is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises[":id"].$get(
			{ param: { id: "not-a-uuid" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises[":id"].$get({
			param: { id: "00000000-0000-4000-8000-000000000000" },
		});

		expect(res.status as number).toBe(401);
	});
});

describe("PUT /api/v1/exercises/:id", () => {
	test("updates the exercise fields", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		const created = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);
		expect(created.status).toBe(201);

		const res = await client.api.v1.exercises[":id"].$put(
			{
				param: { id: body.variationId },
				json: {
					exerciseName: body.exerciseName,
					exerciseType: body.exerciseType,
					variationName: "Halteres",
					muscleId: body.muscleId,
					secondaryMuscleId: null,
					equipmentId: SEED_EQUIPMENT_HALTERES,
					youtubeVideoUrl: null,
					video: null,
				},
			},
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as { id: string };
		expect(data.id).toBe(body.variationId);

		const after = await client.api.v1.exercises[":id"].$get(
			{ param: { id: body.variationId } },
			{ headers: authHeaders("athlete") },
		);
		expect(await after.json()).toMatchObject({
			variationName: "Halteres",
			equipmentId: SEED_EQUIPMENT_HALTERES,
		});
	});

	test("returns 404 for a variation the user does not own", async () => {
		const client = getTestClient();
		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "public" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const publicVariationId = list[0]?.variations[0]?.id as string;

		const res = await client.api.v1.exercises[":id"].$put(
			{
				param: { id: publicVariationId },
				json: {
					exerciseName: "Hacked",
					exerciseType: "musculacao",
					variationName: null,
					muscleId: SEED_MUSCLE_PEITO_ID,
					secondaryMuscleId: null,
					equipmentId: SEED_EQUIPMENT_BARRA,
					youtubeVideoUrl: null,
					video: null,
				},
			},
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(404);
	});

	test("returns 400 when exerciseName is empty", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		await client.api.v1.exercises.$post({ json: body }, { headers: authHeaders("athlete") });

		const res = await client.api.v1.exercises[":id"].$put(
			{
				param: { id: body.variationId },
				json: {
					exerciseName: "",
					exerciseType: "musculacao",
					variationName: null,
					muscleId: SEED_MUSCLE_PEITO_ID,
					secondaryMuscleId: null,
					equipmentId: SEED_EQUIPMENT_BARRA,
					youtubeVideoUrl: null,
					video: null,
				},
			},
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 409 when the update collides with an existing variation", async () => {
		const client = getTestClient();
		const first = newExerciseBody();
		const second = newExerciseBody();
		await client.api.v1.exercises.$post({ json: first }, { headers: authHeaders("athlete") });
		await client.api.v1.exercises.$post({ json: second }, { headers: authHeaders("athlete") });

		// Renaming `second` onto `first`'s name + equipment + variation collides.
		const res = await client.api.v1.exercises[":id"].$put(
			{
				param: { id: second.variationId },
				json: {
					exerciseName: first.exerciseName,
					exerciseType: first.exerciseType,
					variationName: first.variationName,
					muscleId: first.muscleId,
					secondaryMuscleId: null,
					equipmentId: first.equipmentId,
					youtubeVideoUrl: null,
					video: null,
				},
			},
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(409);
	});
});

describe("DELETE /api/v1/exercises", () => {
	test("soft-deletes the user's variations and drops them from the list", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		const created = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);
		expect(created.status).toBe(201);

		const res = await client.api.v1.exercises.$delete(
			{ json: { variationIds: [body.variationId] } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as { deletedCount: number };
		expect(data.deletedCount).toBe(1);

		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "private" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		expect(list.some((e) => e.variations.some((v) => v.id === body.variationId))).toBeFalse();
	});

	test("is idempotent — deleting an already-deleted variation reports zero", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		await client.api.v1.exercises.$post({ json: body }, { headers: authHeaders("athlete") });

		const first = await client.api.v1.exercises.$delete(
			{ json: { variationIds: [body.variationId] } },
			{ headers: authHeaders("athlete") },
		);
		expect(((await first.json()) as { deletedCount: number }).deletedCount).toBe(1);

		const second = await client.api.v1.exercises.$delete(
			{ json: { variationIds: [body.variationId] } },
			{ headers: authHeaders("athlete") },
		);
		expect(second.status).toBe(200);
		expect(((await second.json()) as { deletedCount: number }).deletedCount).toBe(0);
	});

	test("ignores variations the user does not own", async () => {
		const client = getTestClient();
		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "public" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const publicVariationId = list[0]?.variations[0]?.id as string;
		expect(publicVariationId).toBeDefined();

		const res = await client.api.v1.exercises.$delete(
			{ json: { variationIds: [publicVariationId] } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		expect(((await res.json()) as { deletedCount: number }).deletedCount).toBe(0);

		const afterRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "public" } },
			{ headers: authHeaders("athlete") },
		);
		const after = (await afterRes.json()) as ExerciseListItemResponse[];
		expect(after.some((e) => e.variations.some((v) => v.id === publicVariationId))).toBeTrue();
	});

	test("frees the name for reuse once the variation is deleted", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		await client.api.v1.exercises.$post({ json: body }, { headers: authHeaders("athlete") });
		await client.api.v1.exercises.$delete(
			{ json: { variationIds: [body.variationId] } },
			{ headers: authHeaders("athlete") },
		);

		const recreated = await client.api.v1.exercises.$post(
			{ json: { ...body, variationId: crypto.randomUUID() } },
			{ headers: authHeaders("athlete") },
		);
		expect(recreated.status as number).toBe(201);
	});

	test("cascades — soft-deletes the parent exercise once its last variation is gone", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		await client.api.v1.exercises.$post({ json: body }, { headers: authHeaders("athlete") });

		await client.api.v1.exercises.$delete(
			{ json: { variationIds: [body.variationId] } },
			{ headers: authHeaders("athlete") },
		);

		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "private" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		expect(list.some((e) => e.name === body.exerciseName)).toBeFalse();
	});

	test("keeps the parent exercise while another variation stays active", async () => {
		const client = getTestClient();
		const first = newExerciseBody();
		await client.api.v1.exercises.$post({ json: first }, { headers: authHeaders("athlete") });

		const second = {
			...first,
			variationId: crypto.randomUUID(),
			variationName: "Halteres",
			equipmentId: SEED_EQUIPMENT_HALTERES,
		};
		await client.api.v1.exercises.$post({ json: second }, { headers: authHeaders("athlete") });

		await client.api.v1.exercises.$delete(
			{ json: { variationIds: [first.variationId] } },
			{ headers: authHeaders("athlete") },
		);

		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "private" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const exercise = list.find((e) => e.name === first.exerciseName);
		expect(exercise).toBeDefined();
		expect(exercise?.variations.some((v) => v.id === second.variationId)).toBeTrue();
		expect(exercise?.variations.some((v) => v.id === first.variationId)).toBeFalse();
	});

	test("returns 400 when variationIds is empty", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$delete(
			{ json: { variationIds: [] } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 400 when variationIds contains a non-UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$delete(
			{ json: { variationIds: ["not-a-uuid"] } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises.$delete({
			json: { variationIds: ["00000000-0000-4000-8000-000000000000"] },
		});

		expect(res.status as number).toBe(401);
	});
});

describe("DELETE /api/v1/exercises/:id", () => {
	test("soft-deletes the exercise and drops it from the list", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		const created = await client.api.v1.exercises.$post(
			{ json: body },
			{ headers: authHeaders("athlete") },
		);
		expect(created.status).toBe(201);

		const res = await client.api.v1.exercises[":id"].$delete(
			{ param: { id: body.variationId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as { id: string };
		expect(data.id).toBe(body.variationId);

		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "private" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		expect(list.some((e) => e.variations.some((v) => v.id === body.variationId))).toBeFalse();
	});

	test("returns 404 for a variation the user does not own", async () => {
		const client = getTestClient();
		const listRes = await client.api.v1.exercises.$get(
			{ query: { visibility: "public" } },
			{ headers: authHeaders("athlete") },
		);
		const list = (await listRes.json()) as ExerciseListItemResponse[];
		const publicVariationId = list[0]?.variations[0]?.id as string;
		expect(publicVariationId).toBeDefined();

		const res = await client.api.v1.exercises[":id"].$delete(
			{ param: { id: publicVariationId } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(404);
	});

	test("returns 404 when the variation is already deleted", async () => {
		const client = getTestClient();
		const body = newExerciseBody();
		await client.api.v1.exercises.$post({ json: body }, { headers: authHeaders("athlete") });

		const first = await client.api.v1.exercises[":id"].$delete(
			{ param: { id: body.variationId } },
			{ headers: authHeaders("athlete") },
		);
		expect(first.status).toBe(200);

		const second = await client.api.v1.exercises[":id"].$delete(
			{ param: { id: body.variationId } },
			{ headers: authHeaders("athlete") },
		);
		expect(second.status as number).toBe(404);
	});

	test("returns 400 when id is not a UUID", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises[":id"].$delete(
			{ param: { id: "not-a-uuid" } },
			{ headers: authHeaders("athlete") },
		);

		expect(res.status as number).toBe(400);
	});

	test("returns 401 when Authorization header is missing", async () => {
		const client = getTestClient();
		const res = await client.api.v1.exercises[":id"].$delete({
			param: { id: "00000000-0000-4000-8000-000000000000" },
		});

		expect(res.status as number).toBe(401);
	});
});
