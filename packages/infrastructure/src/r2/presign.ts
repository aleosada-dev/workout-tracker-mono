import { AwsClient } from 'aws4fetch';
import type { R2Config } from './config';

/**
 * Presigned GET URLs stay valid for 25h counting from the start of the hour
 * they were signed in. Because the signing timestamp is snapped to the hour
 * (see `presignGetHourSnapped`), a URL minted late in the hour still gets at
 * least 24h of validity — long enough that an API response cached on the
 * client never hands out a URL that has already expired.
 */
const PRESIGN_TTL_SECONDS = 90_000;

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
 * hour, so every call made in the same hour yields the identical URL. That
 * stability lets the client's HTTP cache reuse the response instead of
 * refetching the same object under an ever-changing query string.
 * The URL stays valid for `PRESIGN_TTL_SECONDS` from the start of that hour.
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
