import type { R2Env } from './config';
import { readR2Config } from './config';
import { presignGetHourSnapped } from './presign';

export type BuildUploadedVideoUrlInput = {
  /** R2 object key of the uploaded video. */
  objectKey: string;
  /** Owner of the variation: `null` for the global library, a user id otherwise. */
  variationUserId: string | null;
};

export type BuildUploadedVideoUrl = (input: BuildUploadedVideoUrlInput) => Promise<string>;

/**
 * Builds a playable URL for an uploaded variation video.
 *
 * - Global library videos (`variationUserId === null`) are public content,
 *   served straight from the R2 public domain so the CDN can cache them.
 * - User-uploaded videos are private and only reachable through a short-lived
 *   presigned URL.
 */
export function makeBuildUploadedVideoUrl(env: R2Env): BuildUploadedVideoUrl {
  return async ({ objectKey, variationUserId }) => {
    if (variationUserId === null) {
      const publicBase = env.R2_PUBLIC_BASE;
      if (!publicBase) throw new Error('R2 env var missing: R2_PUBLIC_BASE');
      return `${publicBase.replace(/\/+$/, '')}/${objectKey}`;
    }
    return presignGetHourSnapped(readR2Config(env), objectKey);
  };
}
