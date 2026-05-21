import { describe, expect, test } from 'bun:test';
import { makeBuildUploadedVideoUrl } from './build-uploaded-video-url';
import { makeBuildVideoUploadUrls } from './build-video-upload-urls';
import type { R2Config } from './config';
import { headObject } from './head-object';
import { presignGetHourSnapped } from './presign';
import { presignPut } from './presign-put';

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

describe('presignPut', () => {
  test('signs a PUT URL with the requested TTL', async () => {
    const url = new URL(await presignPut(CONFIG, { key: 'user/var/upload.mp4', ttlSeconds: 600 }));

    expect(url.origin).toBe('https://acc123.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/videos/user/var/upload.mp4');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});

describe('makeBuildVideoUploadUrls', () => {
  const USER_ID = '11111111-1111-4111-8111-111111111111';
  const VARIATION_ID = '22222222-2222-4222-8222-222222222222';
  // Mirrors the variation_videos object_key / thumbnail_key CHECK constraints.
  const OBJECT_KEY_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm|mov)$/;
  const THUMBNAIL_KEY_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/;

  test('builds keys under {userId}/{variationId}/ matching the DB constraints', async () => {
    const build = makeBuildVideoUploadUrls(ENV);
    const result = await build({
      userId: USER_ID,
      variationId: VARIATION_ID,
      videoContentType: 'video/mp4',
    });

    expect(result.video.objectKey).toMatch(OBJECT_KEY_RE);
    expect(result.thumbnail.objectKey).toMatch(THUMBNAIL_KEY_RE);
    expect(result.video.objectKey.startsWith(`${USER_ID}/${VARIATION_ID}/`)).toBe(true);
    expect(result.thumbnail.objectKey.startsWith(`${USER_ID}/${VARIATION_ID}/`)).toBe(true);
    // Video and thumbnail share one upload id, differing only by extension.
    expect(result.video.objectKey.replace(/\.mp4$/, '')).toBe(
      result.thumbnail.objectKey.replace(/\.jpg$/, ''),
    );
    expect(new URL(result.video.uploadUrl).searchParams.get('X-Amz-Signature')).toBeTruthy();
    expect(new URL(result.thumbnail.uploadUrl).searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  test('maps video/quicktime to a .mov extension', async () => {
    const build = makeBuildVideoUploadUrls(ENV);
    const result = await build({
      userId: USER_ID,
      variationId: VARIATION_ID,
      videoContentType: 'video/quicktime',
    });

    expect(result.video.objectKey.endsWith('.mov')).toBe(true);
  });

  test('throws when credentials are missing', async () => {
    const build = makeBuildVideoUploadUrls({});
    await expect(
      build({ userId: USER_ID, variationId: VARIATION_ID, videoContentType: 'video/mp4' }),
    ).rejects.toThrow('R2 env vars missing');
  });
});

describe('headObject', () => {
  test('returns the object size and content type on a 200', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(null, {
        status: 200,
        headers: { 'content-length': '4096', 'content-type': 'video/mp4' },
      })) as unknown as typeof fetch;
    try {
      expect(await headObject(CONFIG, 'user/var/clip.mp4')).toEqual({
        contentLength: 4096,
        contentType: 'video/mp4',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('returns null when the object does not exist (404)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch;
    try {
      expect(await headObject(CONFIG, 'user/var/missing.mp4')).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
