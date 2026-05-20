/**
 * Subset of the Worker bindings the R2 helpers read. Every field is optional so
 * the rest of the API keeps working without R2 configured — the values are only
 * validated at the moment a video URL actually needs to be built.
 */
export type R2Env = {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
};

/** Credentials and bucket needed to presign a private R2 object. */
export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/** Reads the credentials required for presigning. Throws if any are missing. */
export function readR2Config(env: R2Env): R2Config {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'R2 env vars missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}
