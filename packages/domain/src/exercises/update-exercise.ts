import type { CreateExerciseInput } from './create-exercise';

/**
 * Input for updating an existing exercise variation. Structurally identical to
 * {@link CreateExerciseInput} — the difference is intent: here `variationId`
 * references a variation that already exists (it is not minted up front for an
 * R2 upload), and the operation replaces the variation's fields.
 */
export type UpdateExerciseInput = CreateExerciseInput;
