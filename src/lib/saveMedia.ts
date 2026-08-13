interface DownloadEntry {
  url: string;
  filename: string;
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchAsFile({ url, filename }: DownloadEntry): Promise<File | null> {
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

async function fetchAsFiles(entries: DownloadEntry[]): Promise<{ entry: DownloadEntry; file: File | null }[]> {
  const files = await Promise.all(entries.map(fetchAsFile));
  return entries.map((entry, i) => ({ entry, file: files[i] }));
}

/**
 * Opens the real file URL directly instead of relying on the `download`
 * attribute — Safari does not reliably honor `download` for blob/data URLs,
 * but it does let the user save from the native viewer (share icon or
 * long-press) once the file is actually open.
 */
function openDirectly(url: string): void {
  window.open(url, '_blank', 'noopener');
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function saveMediaFile(url: string, filename: string): Promise<void> {
  const file = await fetchAsFile({ url, filename });

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  openDirectly(url);
}

export async function saveMediaFiles(entries: DownloadEntry[]): Promise<void> {
  const fetched = await fetchAsFiles(entries);
  const files = fetched.flatMap(({ file }) => (file ? [file] : []));

  if (files.length > 0 && navigator.share && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  for (const { entry } of fetched) {
    openDirectly(entry.url);
  }
}

export async function shareMediaFiles(entries: DownloadEntry[]): Promise<void> {
  const fetched = await fetchAsFiles(entries);
  const files = fetched.flatMap(({ file }) => (file ? [file] : []));
  if (files.length === 0 || !navigator.share || !navigator.canShare?.({ files })) return;
  try {
    await navigator.share({ files });
  } catch {
    // Cancelled or failed — nothing more useful to do here
  }
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
