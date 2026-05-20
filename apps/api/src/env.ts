export type Env = {
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
	SENTRY_DSN?: string;
	SENTRY_ENVIRONMENT?: string;
	/** Cloudflare R2 — used to build playable URLs for uploaded variation videos. */
	R2_ACCOUNT_ID?: string;
	R2_ACCESS_KEY_ID?: string;
	R2_SECRET_ACCESS_KEY?: string;
	R2_BUCKET_NAME?: string;
	/** Public R2 domain that serves global library videos (no signing). */
	R2_PUBLIC_BASE?: string;
};
