import {
  MAX_VIDEO_DURATION_MS,
  MAX_VIDEO_SIZE_BYTES,
  resolveVideoContentType,
  validatePickedVideo,
} from './video-validation';

describe('resolveVideoContentType', () => {
  test('accepts the supported video types', () => {
    expect(resolveVideoContentType('video/mp4')).toBe('video/mp4');
    expect(resolveVideoContentType('video/webm')).toBe('video/webm');
    expect(resolveVideoContentType('video/quicktime')).toBe('video/quicktime');
  });

  test('ignores casing and codec parameters', () => {
    expect(resolveVideoContentType('VIDEO/MP4')).toBe('video/mp4');
    expect(resolveVideoContentType('video/mp4; codecs="avc1"')).toBe('video/mp4');
  });

  test('returns null for unsupported or missing types', () => {
    expect(resolveVideoContentType('video/avi')).toBeNull();
    expect(resolveVideoContentType(undefined)).toBeNull();
    expect(resolveVideoContentType(null)).toBeNull();
  });
});

describe('validatePickedVideo', () => {
  test('accepts a video within the limits and returns its content type', () => {
    expect(
      validatePickedVideo({
        fileSize: 10 * 1024 * 1024,
        durationMs: 15_000,
        mimeType: 'video/mp4',
      }),
    ).toEqual({ ok: true, contentType: 'video/mp4' });
  });

  test('rejects an unsupported format', () => {
    expect(
      validatePickedVideo({ fileSize: 1_000, durationMs: 5_000, mimeType: 'video/avi' }),
    ).toEqual({ ok: false, reason: 'unsupportedFormat' });
  });

  test('rejects a video at or above the size limit', () => {
    expect(
      validatePickedVideo({
        fileSize: MAX_VIDEO_SIZE_BYTES,
        durationMs: 5_000,
        mimeType: 'video/mp4',
      }),
    ).toEqual({ ok: false, reason: 'tooLarge' });
  });

  test('rejects a video at or above the duration limit', () => {
    expect(
      validatePickedVideo({
        fileSize: 1_000,
        durationMs: MAX_VIDEO_DURATION_MS,
        mimeType: 'video/mp4',
      }),
    ).toEqual({ ok: false, reason: 'tooLong' });
  });

  test('checks the format before size and duration', () => {
    expect(
      validatePickedVideo({
        fileSize: MAX_VIDEO_SIZE_BYTES + 1,
        durationMs: MAX_VIDEO_DURATION_MS + 1,
        mimeType: 'video/avi',
      }),
    ).toEqual({ ok: false, reason: 'unsupportedFormat' });
  });

  test('reports size before duration when both exceed the limits', () => {
    expect(
      validatePickedVideo({
        fileSize: MAX_VIDEO_SIZE_BYTES + 1,
        durationMs: MAX_VIDEO_DURATION_MS + 1,
        mimeType: 'video/mp4',
      }),
    ).toEqual({ ok: false, reason: 'tooLarge' });
  });

  test('skips the size check when fileSize is missing', () => {
    expect(
      validatePickedVideo({ fileSize: undefined, durationMs: 10_000, mimeType: 'video/mp4' }),
    ).toEqual({ ok: true, contentType: 'video/mp4' });
    expect(
      validatePickedVideo({ fileSize: null, durationMs: 10_000, mimeType: 'video/mp4' }),
    ).toEqual({ ok: true, contentType: 'video/mp4' });
  });

  test('skips the duration check when durationMs is missing', () => {
    expect(
      validatePickedVideo({ fileSize: 1_000, durationMs: null, mimeType: 'video/mp4' }),
    ).toEqual({ ok: true, contentType: 'video/mp4' });
  });
});
