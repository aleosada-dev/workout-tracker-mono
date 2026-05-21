import { AwsClient } from 'aws4fetch';
import type { R2Config, R2Env } from './config';
import { readR2Config } from './config';

/** Percent-encodes an object key for a URL path, keeping `/` separators intact. */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export type HeadObjectResult = {
  /** Size in bytes of the stored object. */
  contentLength: number;
  /** Content-Type R2 recorded for the object. */
  contentType: string;
};

/**
 * Issues a signed HEAD request to a private R2 object. Returns its size and
 * content type, or `null` when the object does not exist.
 */
export async function headObject(config: R2Config, key: string): Promise<HeadObjectResult | null> {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });

  const url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${encodeKey(key)}`;
  const response = await aws.fetch(url, { method: 'HEAD' });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`R2 HEAD failed for ${key}: ${response.status}`);
  }

  return {
    contentLength: Number(response.headers.get('content-length') ?? 0),
    contentType: response.headers.get('content-type') ?? '',
  };
}

export type HeadObject = (key: string) => Promise<HeadObjectResult | null>;

/** Binds `headObject` to the R2 credentials read from the Worker env. */
export function makeHeadObject(env: R2Env): HeadObject {
  return async (key) => headObject(readR2Config(env), key);
}
