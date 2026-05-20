export type Env = {
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
	SENTRY_DSN?: string;
	SENTRY_ENVIRONMENT?: string;
	/**
	 * Cloudflare R2 — used to presign playable URLs for variation videos.
	 * The bucket is private; every video is served through a presigned URL.
	 */
	R2_ACCOUNT_ID?: string;
	R2_ACCESS_KEY_ID?: string;
	R2_SECRET_ACCESS_KEY?: string;
	R2_BUCKET_NAME?: string;
};
