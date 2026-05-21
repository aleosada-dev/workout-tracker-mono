import { VIDEO_EXTENSION_BY_CONTENT_TYPE, type VideoContentType } from '@workout-tracker/domain';
import type { R2Env } from './config';
import { readR2Config } from './config';
import { presignPut } from './presign-put';

/** Presigned PUT URL lifetime — generous for a ~100 MB upload on mobile data. */
const UPLOAD_TTL_SECONDS = 600;

export type BuildVideoUploadUrlsInput = {
  /** Authenticated user id (JWT `sub`) — first segment of every object key. */
  userId: string;
  /** Variation id minted by the client — second segment of every object key. */
  variationId: string;
  /** Content type of the device video. */
  videoContentType: VideoContentType;
};

export type VideoUploadTarget = {
  /** R2 object key the file will be stored at. */
  objectKey: string;
  /** Presigned PUT URL the client uploads the file to. */
  uploadUrl: string;
};

export type BuildVideoUploadUrlsResult = {
  /** Shared id of this upload — video and thumbnail differ only by extension. */
  uploadId: string;
  video: VideoUploadTarget;
  thumbnail: VideoUploadTarget;
};

export type BuildVideoUploadUrls = (
  input: BuildVideoUploadUrlsInput,
) => Promise<BuildVideoUploadUrlsResult>;

/**
 * Builds presigned PUT URLs for a device video and its thumbnail.
 *
 * Object keys are assembled server-side from the authenticated `userId`, so a
 * client can never upload into another user's directory. Both files share one
 * server-minted `uploadId` and follow the layout the `variation_videos`
 * object_key / thumbnail_key CHECK constraints expect:
 * `{userId}/{variationId}/{uploadId}.{ext}`.
 */
export function makeBuildVideoUploadUrls(env: R2Env): BuildVideoUploadUrls {
  return async ({ userId, variationId, videoContentType }) => {
    const config = readR2Config(env);
    const uploadId = crypto.randomUUID();
    const ext = VIDEO_EXTENSION_BY_CONTENT_TYPE[videoContentType];

    const videoKey = `${userId}/${variationId}/${uploadId}.${ext}`;
    const thumbnailKey = `${userId}/${variationId}/${uploadId}.jpg`;

    const [videoUrl, thumbnailUrl] = await Promise.all([
      presignPut(config, { key: videoKey, ttlSeconds: UPLOAD_TTL_SECONDS }),
      presignPut(config, { key: thumbnailKey, ttlSeconds: UPLOAD_TTL_SECONDS }),
    ]);

    return {
      uploadId,
      video: { objectKey: videoKey, uploadUrl: videoUrl },
      thumbnail: { objectKey: thumbnailKey, uploadUrl: thumbnailUrl },
    };
  };
}
