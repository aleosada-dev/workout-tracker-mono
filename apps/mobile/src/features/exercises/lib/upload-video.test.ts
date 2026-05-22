jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn() }));
jest.mock('@/features/exercises/api/exercises', () => ({ createVideoUploadUrls: jest.fn() }));

import * as VideoThumbnails from 'expo-video-thumbnails';
import { createVideoUploadUrls } from '@/features/exercises/api/exercises';
import { uploadExerciseVideo, uploadToR2 } from './upload-video';

type ProgressEvent = { lengthComputable: boolean; loaded: number; total: number };
type Behavior = 'success' | 'badStatus' | 'error';

let behavior: Behavior = 'success';
const instances: MockXHR[] = [];

/** Auto-completing XHR stub: `send` resolves on a microtask per `behavior`. */
class MockXHR {
  status = 0;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: unknown) {
    this.body = body;
    void Promise.resolve().then(() => {
      if (behavior === 'error') {
        this.onerror?.();
        return;
      }
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
      this.status = behavior === 'badStatus' ? 500 : 200;
      this.onload?.();
    });
  }
}

const getThumbnailAsync = VideoThumbnails.getThumbnailAsync as jest.Mock;
const mockCreateVideoUploadUrls = createVideoUploadUrls as jest.Mock;

beforeEach(() => {
  behavior = 'success';
  instances.length = 0;
  jest.clearAllMocks();
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = MockXHR;
});

describe('uploadToR2', () => {
  test('PUTs the file, forwards progress, and resolves with the bytes sent', async () => {
    const onProgress = jest.fn();

    const result = await uploadToR2({
      uploadUrl: 'https://r2.example/put',
      fileUri: 'file:///tmp/video.mp4',
      contentType: 'video/mp4',
      onProgress,
    });

    expect(result).toEqual({ sizeBytes: 100 });
    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(onProgress).toHaveBeenLastCalledWith(1);
    expect(instances[0].method).toBe('PUT');
    expect(instances[0].url).toBe('https://r2.example/put');
    expect(instances[0].headers['Content-Type']).toBe('video/mp4');
  });

  test('rejects on a non-2xx response', async () => {
    behavior = 'badStatus';

    await expect(
      uploadToR2({
        uploadUrl: 'https://r2.example/put',
        fileUri: 'file:///tmp/video.mp4',
        contentType: 'video/mp4',
      }),
    ).rejects.toThrow('R2 upload failed: HTTP 500');
  });

  test('rejects on a network error', async () => {
    behavior = 'error';

    await expect(
      uploadToR2({
        uploadUrl: 'https://r2.example/put',
        fileUri: 'file:///tmp/video.mp4',
        contentType: 'video/mp4',
      }),
    ).rejects.toThrow('R2 upload network error');
  });
});

describe('uploadExerciseVideo', () => {
  test('generates a thumbnail, uploads both files, and returns the metadata', async () => {
    getThumbnailAsync.mockResolvedValue({ uri: 'file:///tmp/thumb.jpg' });
    mockCreateVideoUploadUrls.mockResolvedValue({
      uploadId: 'upload-1',
      video: { objectKey: 'user/var/upload-1.mp4', uploadUrl: 'https://r2.example/put-video' },
      thumbnail: { objectKey: 'user/var/upload-1.jpg', uploadUrl: 'https://r2.example/put-thumb' },
    });
    const onProgress = jest.fn();

    const result = await uploadExerciseVideo({
      variationId: 'var-1',
      fileUri: 'file:///tmp/video.mp4',
      contentType: 'video/mp4',
      durationMs: 12_400,
      sizeBytes: 2_048_000,
      onProgress,
    });

    expect(mockCreateVideoUploadUrls).toHaveBeenCalledWith({
      variationId: 'var-1',
      videoContentType: 'video/mp4',
    });
    expect(result).toEqual({
      objectKey: 'user/var/upload-1.mp4',
      thumbnailKey: 'user/var/upload-1.jpg',
      durationSeconds: 12,
      // The picker's file size, not the byte count derived from XHR progress.
      sizeBytes: 2_048_000,
      contentType: 'video/mp4',
    });
    // Two uploads in order: the video, then the JPG thumbnail.
    expect(instances).toHaveLength(2);
    expect(instances[1].headers['Content-Type']).toBe('image/jpeg');
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  test('clamps a missing duration into the 1-30s range', async () => {
    getThumbnailAsync.mockResolvedValue({ uri: 'file:///tmp/thumb.jpg' });
    mockCreateVideoUploadUrls.mockResolvedValue({
      uploadId: 'upload-2',
      video: { objectKey: 'k.mp4', uploadUrl: 'https://r2.example/v' },
      thumbnail: { objectKey: 'k.jpg', uploadUrl: 'https://r2.example/t' },
    });

    const result = await uploadExerciseVideo({
      variationId: 'var-2',
      fileUri: 'file:///tmp/video.mp4',
      contentType: 'video/mp4',
      durationMs: null,
      sizeBytes: 1024,
      onProgress: jest.fn(),
    });

    expect(result.durationSeconds).toBe(1);
  });

  test('falls back to the uploaded byte count when the picker reports no size', async () => {
    getThumbnailAsync.mockResolvedValue({ uri: 'file:///tmp/thumb.jpg' });
    mockCreateVideoUploadUrls.mockResolvedValue({
      uploadId: 'upload-3',
      video: { objectKey: 'k.mp4', uploadUrl: 'https://r2.example/v' },
      thumbnail: { objectKey: 'k.jpg', uploadUrl: 'https://r2.example/t' },
    });

    const result = await uploadExerciseVideo({
      variationId: 'var-3',
      fileUri: 'file:///tmp/video.mp4',
      contentType: 'video/mp4',
      durationMs: 5_000,
      sizeBytes: null,
      onProgress: jest.fn(),
    });

    // No picker size, so the byte count from the MockXHR progress event wins.
    expect(result.sizeBytes).toBe(100);
  });
});
