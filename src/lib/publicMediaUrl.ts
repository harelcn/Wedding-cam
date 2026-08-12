export function publicMediaUrl(
  storageKey: string,
  baseUrl: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string
): string {
  if (!baseUrl) {
    throw new Error('Missing VITE_R2_PUBLIC_BASE_URL environment variable');
  }
  return `${baseUrl.replace(/\/$/, '')}/${storageKey}`;
}
