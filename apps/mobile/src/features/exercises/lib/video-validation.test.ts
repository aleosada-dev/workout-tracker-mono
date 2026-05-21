import {
  MAX_VIDEO_DURATION_MS,
  MAX_VIDEO_SIZE_BYTES,
  validatePickedVideo,
} from './video-validation';

describe('validatePickedVideo', () => {
  test('accepts a video within both limits', () => {
    expect(validatePickedVideo({ fileSize: 10 * 1024 * 1024, durationMs: 15_000 })).toEqual({
      ok: true,
    });
  });

  test('rejects a video at or above the size limit', () => {
    expect(validatePickedVideo({ fileSize: MAX_VIDEO_SIZE_BYTES, durationMs: 5_000 })).toEqual({
      ok: false,
      reason: 'tooLarge',
    });
  });

  test('rejects a video at or above the duration limit', () => {
    expect(validatePickedVideo({ fileSize: 1_000, durationMs: MAX_VIDEO_DURATION_MS })).toEqual({
      ok: false,
      reason: 'tooLong',
    });
  });

  test('reports size before duration when both exceed the limits', () => {
    expect(
      validatePickedVideo({
        fileSize: MAX_VIDEO_SIZE_BYTES + 1,
        durationMs: MAX_VIDEO_DURATION_MS + 1,
      }),
    ).toEqual({ ok: false, reason: 'tooLarge' });
  });

  test('skips the size check when fileSize is missing', () => {
    expect(validatePickedVideo({ fileSize: undefined, durationMs: 10_000 })).toEqual({ ok: true });
    expect(validatePickedVideo({ fileSize: null, durationMs: 10_000 })).toEqual({ ok: true });
  });

  test('skips the duration check when durationMs is missing', () => {
    expect(validatePickedVideo({ fileSize: 1_000, durationMs: null })).toEqual({ ok: true });
  });
});
