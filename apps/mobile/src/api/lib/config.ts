const url = process.env.EXPO_PUBLIC_API_URL;

if (!url) {
  throw new Error('Missing EXPO_PUBLIC_API_URL. Set it in .env.');
}

const baseUrl = url;

export function getBaseUrl(): string {
  return baseUrl;
}
