const indent = (text: string): string => text.replace(/\n/g, "\n  ");

/**
 * Renders an error in full — message, stack and the whole `cause` chain — so
 * `wrangler dev` shows the real failure instead of a bare 500. Supabase RPC
 * failures arrive wrapped, with the PostgREST error (code, details, hint) as
 * `cause`; walking the chain is what keeps that detail visible.
 */
export function formatError(err: unknown): string {
	if (err instanceof Error) {
		let out = err.stack ?? `${err.name}: ${err.message}`;
		if (err.cause != null) {
			out += `\n  ↳ caused by: ${indent(formatError(err.cause))}`;
		}
		return out;
	}

	if (typeof err === "object") {
		try {
			return JSON.stringify(err, null, 2);
		} catch {
			return String(err);
		}
	}

	return String(err);
}
