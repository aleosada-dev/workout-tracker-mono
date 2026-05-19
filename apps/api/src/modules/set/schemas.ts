import { WORKOUT_SET_TYPES } from "@workout-tracker/domain";
import { z } from "zod";

export const SetTypeSchema = z.enum(WORKOUT_SET_TYPES);
