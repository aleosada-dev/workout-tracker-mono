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

const ENV = {
  R2_ACCOUNT_ID: CONFIG.accountId,
  R2_ACCESS_KEY_ID: CONFIG.accessKeyId,
  R2_SECRET_ACCESS_KEY: CONFIG.secretAccessKey,
  R2_BUCKET_NAME: CONFIG.bucket,
};

describe('presignGetHourSnapped', () => {
  test('signs a GET URL anchored to the start of the current hour', async () => {
    const url = new URL(await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4'));

    expect(url.origin).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/videos/user/var/clip.mp4');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('90000');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    // hour-snapped: the X-Amz-Date minutes and seconds are zeroed.
    expect(url.searchParams.get('X-Amz-Date')).toMatch(/^\d{8}T\d{2}0000Z$/);
  });

  test('is deterministic within the same hour so the client can cache it', async () => {
    const first = await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4');
    const second = await presignGetHourSnapped(CONFIG, 'user/var/clip.mp4');
    expect(first).toBe(second);
  });
});

describe('makeBuildUploadedVideoUrl', () => {
  test('presigns the object key against the private bucket', async () => {
    const build = makeBuildUploadedVideoUrl(ENV);
    const url = new URL(await build({ objectKey: 'catalog/var/clip.mp4' }));

    expect(url.origin).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  test('presigns library and user uploads the same way — no public path', async () => {
    const build = makeBuildUploadedVideoUrl(ENV);
    const [library, userUpload] = await Promise.all([
      build({ objectKey: 'catalog/var/clip.mp4' }),
      build({ objectKey: 'user/var/clip.mp4' }),
    ]);

    expect(new URL(library).searchParams.get('X-Amz-Signature')).toBeTruthy();
    expect(new URL(userUpload).searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  test('throws when credentials are missing', async () => {
    const build = makeBuildUploadedVideoUrl({});
    await expect(build({ objectKey: 'catalog/var/clip.mp4' })).rejects.toThrow(
      'R2 env vars missing',
    );
  });
});
