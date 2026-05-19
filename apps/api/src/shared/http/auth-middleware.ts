import { createSupabaseClient } from "@workout-tracker/infrastructure";
import { createMiddleware } from "hono/factory";
import type { AppBindings, UserClaims } from "./types";

export const bearerAuthMiddleware = createMiddleware<AppBindings>(async (c, next) => {
	const header = c.req.header("Authorization");
	const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

	if (!token) {
		return c.json({ error: "Missing or invalid Authorization header" }, 401);
	}

	const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_KEY);

	try {
		const { data, error } = await supabase.auth.getClaims(token);
		if (error || !data) {
			return c.json({ error: "Invalid or expired token" }, 401);
		}
		c.set("accessToken", token);
		c.set("userClaims", data.claims as UserClaims);
	} catch {
		return c.json({ error: "Invalid or expired token" }, 401);
	}

	await next();
});
