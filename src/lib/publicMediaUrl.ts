export function publicMediaUrl(
  storageKey: string,
  baseUrl: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string
): string {
  return `${baseUrl.replace(/\/$/, '')}/${storageKey}`;
}
