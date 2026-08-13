export interface MediaDownloadEntry {
  url: string;
  filename: string;
}

const FETCH_TIMEOUT_MS = 15_000;

export async function fetchFile({ url, filename }: MediaDownloadEntry): Promise<File | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || undefined });
  } catch {
    return null;
  }
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function canShareFiles(files: File[]): boolean {
  return files.length > 0 && isShareSupported() && !!navigator.canShare?.({ files });
}

/**
 * Call this synchronously inside a click handler, with files that were
 * already fetched ahead of time (no `await` before this call). Safari
 * silently ignores navigator.share() once it's no longer within the
 * user's original tap — even a single prior network fetch is enough to
 * lose that window, which is why every file here must be pre-fetched.
 */
export function shareFilesSync(files: File[]): Promise<boolean> {
  if (!canShareFiles(files)) return Promise.resolve(false);
  return navigator
    .share({ files })
    .then(() => true)
    .catch((err) => {
      // A deliberate user cancel still counts as "handled"
      return err instanceof Error && err.name === 'AbortError';
    });
}

/**
 * Opens the real file URL directly instead of relying on the `download`
 * attribute — Safari does not reliably honor `download` for blob/data URLs.
 * Must also be called synchronously within the click handler for the same
 * reason as shareFilesSync.
 */
export function openDirectly(url: string): void {
  window.open(url, '_blank', 'noopener');
}

export async function shareDataUrlImage(dataUrl: string, filename: string, title?: string): Promise<void> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
  } catch {
    // Fetching/wrapping the data URL failed — still fall through to opening it directly
  }

  openDirectly(dataUrl);
}
