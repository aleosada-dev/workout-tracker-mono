import { describe, expect, test } from "bun:test";
import { UpsertWorkoutExerciseRequestSchema, WorkoutDetailExerciseSchema } from "./schemas";

describe("WorkoutDetailExerciseSchema", () => {
	const base = {
		id: "a0000000-0000-4000-8000-000000000001",
		exerciseType: "strength",
		position: 0,
		supersetGroupId: "a0000000-0000-4000-8000-000000000001",
		supersetOrder: 0,
		note: null,
		restSeconds: null,
		variation: {
			id: "a0000000-0000-4000-8000-0000000000a1",
			slug: null,
			name: null,
			exercise: { slug: null, name: "Supino", type: "musculacao" },
			measurementType: "weight_reps",
			equipment: { slug: "barbell", preposition: "com" },
			muscle: { slug: "chest" },
			secondaryMuscle: null,
		},
		sets: [],
	};

	test("accepts a null alternativeOfId", () => {
		const parsed = WorkoutDetailExerciseSchema.parse({ ...base, alternativeOfId: null });
		expect(parsed.alternativeOfId).toBeNull();
	});

	test("accepts a uuid alternativeOfId", () => {
		const id = "a0000000-0000-4000-8000-000000000002";
		const parsed = WorkoutDetailExerciseSchema.parse({ ...base, alternativeOfId: id });
		expect(parsed.alternativeOfId).toBe(id);
	});
});

describe("UpsertWorkoutExerciseRequestSchema", () => {
	const set = {
		id: "a0000000-0000-4000-8000-000000000011",
		setOrder: 0,
		setType: "normal",
		repsMin: 8,
		repsMax: 10,
		durationSeconds: null,
		distanceMeters: null,
		roundOrder: 0,
		linkedSetId: null,
		loadPercentOfPrevious: null,
	};
	const exercise = {
		id: "a0000000-0000-4000-8000-000000000001",
		variationId: "a0000000-0000-4000-8000-0000000000a1",
		exerciseType: "strength",
		position: 0,
		supersetGroupId: "a0000000-0000-4000-8000-000000000001",
		supersetOrder: 0,
		note: null,
		restSeconds: null,
		sets: [set],
	};

	test("defaults alternative to null when omitted", () => {
		const parsed = UpsertWorkoutExerciseRequestSchema.parse(exercise);
		expect(parsed.alternative).toBeNull();
	});

	test("accepts an alternative with its own variation and sets", () => {
		const parsed = UpsertWorkoutExerciseRequestSchema.parse({
			...exercise,
			alternative: {
				id: "a0000000-0000-4000-8000-0000000000b1",
				variationId: "a0000000-0000-4000-8000-0000000000a2",
				note: null,
				restSeconds: 90,
				sets: [{ ...set, id: "a0000000-0000-4000-8000-000000000022" }],
			},
		});
		expect(parsed.alternative?.variationId).toBe("a0000000-0000-4000-8000-0000000000a2");
		expect(parsed.alternative?.sets).toHaveLength(1);
	});
});
