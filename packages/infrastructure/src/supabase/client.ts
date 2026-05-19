import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type Supabase = SupabaseClient<Database>;

export function createSupabaseClient(
	url: string,
	key: string,
	accessToken?: string,
): Supabase {
	return createClient<Database>(url, key, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
		global: accessToken
			? { headers: { Authorization: `Bearer ${accessToken}` } }
			: undefined,
	});
}
