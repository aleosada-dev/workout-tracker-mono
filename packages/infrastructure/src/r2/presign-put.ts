import { AwsClient } from 'aws4fetch';
import type { R2Config } from './config';

/** Formats a Date as the AWS SigV4 `X-Amz-Date` value (`YYYYMMDDTHHMMSSZ`). */
function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/** Percent-encodes an object key for a URL path, keeping `/` separators intact. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export type PresignPutInput = {
  /** R2 object key the upload will write to. */
  key: string;
  /** Seconds the URL stays valid, counting from now. */
  ttlSeconds: number;
};

/**
 * Returns a presigned PUT URL for a single upload to the private R2 bucket.
 *
 * Only `host` is signed (aws4fetch's default for query-signed URLs): the
 * uploader sets its own `Content-Type`, which `headObject` then verifies
 * against the declared metadata when the exercise is created. Unlike
 * `presignGetHourSnapped` the signature is not hour-snapped — an upload URL is
 * used once, so deterministic caching is irrelevant.
 */
export async function presignPut(config: R2Config, input: PresignPutInput): Promise<string> {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const url = new URL(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${encodeKey(input.key)}`,
  );
  url.searchParams.set('X-Amz-Expires', String(input.ttlSeconds));

  const signed = await aws.sign(url.toString(), {
    method: 'PUT',
    aws: { signQuery: true, datetime: toAmzDate(new Date()) },
  });
  return signed.url;
}
