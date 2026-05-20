import { describe, expect, test } from 'bun:test';
import { makeBuildUploadedVideoUrl } from './build-uploaded-video-url';
import type { R2Config } from './config';
import { presignGetHourSnapped } from './presign';

const CONFIG: R2Config = {
  accountId: 'acc123',
  accessKeyId: 'AKIAEXAMPLE',
  secretAccessKey: 'secret-key',
  bucket: 'videos',
};

describe('presignGetHourSnapped', () => {
  test('signs a GET URL anchored to the start of the current hour', async () => {
    const url = new URL(await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4'));

    expect(url.origin).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/videos/user/var/clip.mp4');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3900');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    // hour-snapped: the X-Amz-Date minutes and seconds are zeroed.
    expect(url.searchParams.get('X-Amz-Date')).toMatch(/^\d{8}T\d{2}0000Z$/);
  });

  test('is deterministic within the same hour so the CDN can cache it', async () => {
    const first = await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4');
    const second = await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4');
    expect(first).toBe(second);
  });
});

describe('makeBuildUploadedVideoUrl', () => {
  test('returns a public URL for global library videos (variationUserId null)', async () => {
    const build = makeBuildUploadedVideoUrl({ R2_PUBLIC_BASE: 'https://cdn.example.com/' });
    const url = await build({ objectKey: 'global/var/clip.mp4', variationUserId: null });
    expect(url).toBe('https://cdn.example.com/global/var/clip.mp4');
  });

  test('returns a presigned URL for user-owned videos', async () => {
    const build = makeBuildUploadedVideoUrl({
      R2_ACCOUNT_ID: CONFIG.accountId,
      R2_ACCESS_KEY_ID: CONFIG.accessKeyId,
      R2_SECRET_ACCESS_KEY: CONFIG.secretAccessKey,
      R2_BUCKET_NAME: CONFIG.bucket,
    });
    const url = await build({ objectKey: 'user/var/clip.mp4', variationUserId: 'user-1' });
    expect(url).toContain('acc123.r2.cloudflarestorage.com');
    expect(url).toContain('X-Amz-Signature=');
  });

  test('throws when R2_PUBLIC_BASE is missing for a public video', async () => {
    const build = makeBuildUploadedVideoUrl({});
    await expect(
      build({ objectKey: 'global/var/clip.mp4', variationUserId: null }),
    ).rejects.toThrow('R2_PUBLIC_BASE');
  });

  test('throws when credentials are missing for a user-owned video', async () => {
    const build = makeBuildUploadedVideoUrl({ R2_PUBLIC_BASE: 'https://cdn.example.com' });
    await expect(
      build({ objectKey: 'user/var/clip.mp4', variationUserId: 'user-1' }),
    ).rejects.toThrow('R2 env vars missing');
  });
});
