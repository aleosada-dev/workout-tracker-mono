import { z } from "zod";

const coerceToArray = (v: unknown): unknown =>
	v === undefined ? undefined : Array.isArray(v) ? v : [v];

export const arrayQuery = <T extends z.ZodType>(itemSchema: T) =>
	z.preprocess(coerceToArray, z.array(itemSchema).min(1));
