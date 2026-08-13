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

function isDebugMode(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
}

/**
 * Call this synchronously inside a click handler, with files that were
 * already fetched ahead of time (no `await` before this call). Safari
 * silently ignores navigator.share() once it's no longer within the
 * user's original tap — even a single prior network fetch is enough to
 * lose that window, which is why every file here must be pre-fetched.
 */
export function shareFilesSync(files: File[]): Promise<boolean> {
  if (files.length === 0) {
    if (isDebugMode()) alert('דיבוג: אין קבצים לשיתוף');
    return Promise.resolve(false);
  }
  if (!isShareSupported()) {
    if (isDebugMode()) alert('דיבוג: navigator.share לא קיים בדפדפן הזה');
    return Promise.resolve(false);
  }
  const filesDescription = files.map((f) => `${f.name} (${f.type || 'no-type'}, ${f.size}B)`).join(', ');
  if (!navigator.canShare?.({ files })) {
    if (isDebugMode()) alert(`דיבוג: canShare החזיר false עבור: ${filesDescription}`);
    return Promise.resolve(false);
  }
  return navigator
    .share({ files })
    .then(() => true)
    .catch((err) => {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isDebugMode() && !isAbort) {
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        alert(`דיבוג: share() נכשל: ${message}\nקבצים: ${filesDescription}`);
      }
      // A deliberate user cancel still counts as "handled"
      return isAbort;
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
