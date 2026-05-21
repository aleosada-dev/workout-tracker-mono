import * as VideoThumbnails from 'expo-video-thumbnails';
import type { CreateExerciseRequest } from '../api/exercises';
import { createVideoUploadUrls } from '../api/exercises';
import type { VideoContentType } from './video-validation';

/** Resolved upload metadata, ready to send as the POST /exercises `video` field. */
export type ExerciseVideoUpload = NonNullable<CreateExerciseRequest['video']>;

type ProgressListener = (fraction: number) => void;

type UploadToR2Options = {
  uploadUrl: string;
  fileUri: string;
  contentType: string;
  onProgress?: ProgressListener;
};

/**
 * Uploads a local file to a presigned R2 URL with progress reporting.
 *
 * Deliberate exception to the "no direct fetch" rule (apps/mobile/CLAUDE.md):
 * R2 is third-party object storage reached through a one-shot presigned URL —
 * no base URL, no auth header — and the upload needs progress events, which the
 * React Native `fetch` does not expose. `XMLHttpRequest.upload.onprogress` is
 * the only RN API that reports upload progress.
 *
 * Resolves with the total bytes sent — the authoritative size to persist.
 */
export function uploadToR2({
  uploadUrl,
  fileUri,
  contentType,
  onProgress,
}: UploadToR2Options): Promise<{ sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let sizeBytes = 0;

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      sizeBytes = event.total;
      onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ sizeBytes });
      } else {
        reject(new Error(`R2 upload failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('R2 upload network error'));
    xhr.onabort = () => reject(new Error('R2 upload aborted'));

    // RN's XHR streams a file body straight from disk when given the { uri }
    // form, avoiding loading the whole video into memory.
    const body = { uri: fileUri, type: contentType, name: 'upload' };
    xhr.send(body as unknown as FormData);
  });
}

/** Share of the progress bar given to the (large) video vs the small thumbnail. */
const VIDEO_PROGRESS_SHARE = 0.95;

/**
 * Uploads a device video and its generated thumbnail to R2, then returns the
 * metadata to persist with the exercise. Runs entirely before POST /exercises —
 * the variation row only comes into existence once the upload has succeeded.
 */
export async function uploadExerciseVideo({
  variationId,
  fileUri,
  contentType,
  durationMs,
  onProgress,
}: {
  variationId: string;
  fileUri: string;
  contentType: VideoContentType;
  durationMs: number | null;
  onProgress: ProgressListener;
}): Promise<ExerciseVideoUpload> {
  const thumbnail = await VideoThumbnails.getThumbnailAsync(fileUri, {
    time: 0,
    quality: 0.7,
  });

  const urls = await createVideoUploadUrls({ variationId, videoContentType: contentType });

  const { sizeBytes } = await uploadToR2({
    uploadUrl: urls.video.uploadUrl,
    fileUri,
    contentType,
    onProgress: (fraction) => onProgress(fraction * VIDEO_PROGRESS_SHARE),
  });

  await uploadToR2({
    uploadUrl: urls.thumbnail.uploadUrl,
    fileUri: thumbnail.uri,
    contentType: 'image/jpeg',
    onProgress: (fraction) =>
      onProgress(VIDEO_PROGRESS_SHARE + fraction * (1 - VIDEO_PROGRESS_SHARE)),
  });

  // duration_seconds must land in 1..30 (variation_videos CHECK constraint).
  const durationSeconds = Math.max(1, Math.min(30, Math.round((durationMs ?? 1000) / 1000)));

  return {
    objectKey: urls.video.objectKey,
    thumbnailKey: urls.thumbnail.objectKey,
    durationSeconds,
    sizeBytes,
    contentType,
  };
}
