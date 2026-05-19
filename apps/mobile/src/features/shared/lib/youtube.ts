/**
 * Extracts an 11-character YouTube video ID from a URL.
 * Supports `watch?v=`, `youtu.be/`, `embed/` and `shorts/` formats. Returns
 * `null` if the URL is missing, malformed, or not from YouTube.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;

  const patterns: RegExp[] = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
