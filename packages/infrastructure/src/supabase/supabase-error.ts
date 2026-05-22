/** The diagnostic fields a Supabase/PostgREST failure carries. */
type SupabaseErrorLike = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

/**
 * Builds an Error from a Supabase/PostgREST failure that keeps every diagnostic
 * field. `error.message` alone hides the SQLSTATE `code`, the `details` and the
 * `hint` — exactly what tells a constraint violation apart from a `RAISE` inside
 * a `wt_*` function. The raw error is kept as `cause` so a structured logger can
 * print it in full.
 */
export function supabaseError(operation: string, error: SupabaseErrorLike): Error {
  const parts = [error.message];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  return new Error(`${operation}: ${parts.join(' | ')}`, { cause: error });
}
