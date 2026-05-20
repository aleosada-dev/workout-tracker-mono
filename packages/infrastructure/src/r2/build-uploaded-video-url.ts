import type { R2Env } from './config';
import { readR2Config } from './config';
import { presignGetHourSnapped } from './presign';

export type BuildUploadedVideoUrlInput = {
  /** R2 object key of the uploaded video. */
  objectKey: string;
};

export type BuildUploadedVideoUrl = (input: BuildUploadedVideoUrlInput) => Promise<string>;

/**
 * Builds a playable URL for an uploaded variation video.
 *
 * The R2 bucket is private, so every video — global library and user uploads
 * alike — is reachable only through a short-lived presigned URL. There is no
 * public, unsigned path to any object.
 */
export function makeBuildUploadedVideoUrl(env: R2Env): BuildUploadedVideoUrl {
  return async ({ objectKey }) => presignGetHourSnapped(readR2Config(env), objectKey);
}
