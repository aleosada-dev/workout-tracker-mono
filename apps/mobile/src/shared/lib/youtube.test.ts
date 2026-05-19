import { extractYouTubeVideoId } from '@/shared/lib/youtube';

describe('extractYouTubeVideoId', () => {
  const VIDEO_ID = 'dQw4w9WgXcQ';

  test('extracts from watch?v= URLs', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  test('extracts from youtu.be short links', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  test('extracts from /embed/ URLs', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  test('extracts from /shorts/ URLs', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  test('survives extra query params before or after v=', () => {
    expect(
      extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&list=PL123&index=2`),
    ).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?list=PL123&v=${VIDEO_ID}`)).toBe(
      VIDEO_ID,
    );
  });

  test('is case insensitive on the host', () => {
    expect(extractYouTubeVideoId(`https://YouTube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
    expect(extractYouTubeVideoId(`https://YOUTU.BE/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  test('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/123456789')).toBeNull();
    expect(extractYouTubeVideoId('https://example.com/watch?v=abcdefghijk')).toBeNull();
  });

  test('returns null for empty / missing input', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
    expect(extractYouTubeVideoId(null)).toBeNull();
    expect(extractYouTubeVideoId(undefined)).toBeNull();
  });

  test('returns null when no 11-char id is present', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=tooShort')).toBeNull();
    expect(extractYouTubeVideoId('https://youtu.be/')).toBeNull();
  });
});
