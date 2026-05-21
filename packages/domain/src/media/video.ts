/**
 * Canonical definition of the video formats and limits the product accepts for
 * exercise demonstration videos. Single source of truth: the API Zod schemas,
 * the R2 object-key builder and the mobile picker validation all derive from
 * here.
 *
 * The database mirrors these values — the `variation_videos` CHECK constraints
 * (content_type, size_bytes, duration_seconds) and the object_key / thumbnail_key
 * regexes. SQL cannot import TypeScript, so that copy is kept in sync by hand;
 * see supabase/migrations.
 */

/** Accepted device-video content types. */
export const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type VideoContentType = (typeof VIDEO_CONTENT_TYPES)[number];

/** File extension used in the R2 object key for each accepted content type. */
export const VIDEO_EXTENSION_BY_CONTENT_TYPE = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
} as const satisfies Record<VideoContentType, string>;

/** Maximum accepted size of a device video, in bytes (100 MB). */
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

/** Maximum accepted duration of a device video, in seconds. */
export const MAX_VIDEO_DURATION_SECONDS = 30;
