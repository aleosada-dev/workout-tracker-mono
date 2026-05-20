import { AwsClient } from 'aws4fetch';
import type { R2Config } from './config';

/**
 * Presigned GET URLs stay valid for 1h05 counting from the hour they were
 * signed in. The extra 5 minutes is grace for a request that starts just before
 * the wall-clock hour rolls over.
 */
const PRESIGN_TTL_SECONDS = 3900;

/** Formats a Date as the AWS SigV4 `X-Amz-Date` value (`YYYYMMDDTHHMMSSZ`). */
function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/** Percent-encodes an object key for a URL path, keeping `/` separators intact. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * Returns a presigned GET URL whose signature is deterministic within the
 * current wall-clock hour: the signing timestamp is snapped to the start of the
 * hour, so every call made in the same hour yields the identical URL — critical
 * for CDN cacheability, since a per-request timestamp would defeat the cache.
 * The URL expires at the next hour + 5min.
 */
export async function presignGetHourSnapped(config: R2Config, key: string): Promise<string> {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const hourStartMs = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const url = new URL(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${encodeKey(key)}`,
  );
  url.searchParams.set('X-Amz-Expires', String(PRESIGN_TTL_SECONDS));

  const signed = await aws.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true, datetime: toAmzDate(new Date(hourStartMs)) },
  });
  return signed.url;
}
