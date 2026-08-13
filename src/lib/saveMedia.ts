export interface MediaDownloadEntry {
  url: string;
  filename: string;
}

function isDebugMode(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
}

function debugAlert(message: string): void {
  if (isDebugMode()) alert(`דיבוג: ${message}`);
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Opens the real file URL directly — lets the user save/share it via the
 * browser's own native UI (long-press, or the browser's share icon).
 */
export function openDirectly(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/**
 * Shares a single item's direct URL (opens the native share sheet — e.g.
 * WhatsApp) instead of fetching the file into a Blob first. Fetching has
 * proven unreliable on some real devices/networks even when the same URL
 * loads fine via normal navigation, and URL sharing needs no fetch at all,
 * so it isn't affected by whatever is blocking those fetches.
 */
export function shareOne(entry: MediaDownloadEntry, title?: string): void {
  if (!isShareSupported()) {
    openDirectly(entry.url);
    return;
  }
  navigator.share({ url: entry.url, title }).catch((err) => {
    if (err instanceof Error && err.name === 'AbortError') return;
    debugAlert(`share(url) נכשל: ${err instanceof Error ? err.message : String(err)}`);
    openDirectly(entry.url);
  });
}

/** Same idea for multiple items at once — shared as a newline-separated list of links. */
export function shareMany(entries: MediaDownloadEntry[]): void {
  if (entries.length === 0) return;
  if (entries.length === 1) {
    shareOne(entries[0]);
    return;
  }
  if (!isShareSupported()) {
    entries.forEach((entry) => openDirectly(entry.url));
    return;
  }
  navigator.share({ text: entries.map((entry) => entry.url).join('\n') }).catch((err) => {
    if (err instanceof Error && err.name === 'AbortError') return;
    debugAlert(`share(text) נכשל: ${err instanceof Error ? err.message : String(err)}`);
    entries.forEach((entry) => openDirectly(entry.url));
  });
}

export function downloadOne(entry: MediaDownloadEntry): void {
  openDirectly(entry.url);
}

export function downloadMany(entries: MediaDownloadEntry[]): void {
  entries.forEach((entry) => openDirectly(entry.url));
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
    // Fetching/wrapping the LOCAL data: URI failed (no network involved) — fall through
  }

  openDirectly(dataUrl);
}
