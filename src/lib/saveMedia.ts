export interface MediaDownloadEntry {
  url: string;
  filename: string;
  type: 'image' | 'video';
}

function isDebugMode(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
}

function debugAlert(message: string): void {
  if (isDebugMode()) alert(`דיבוג: ${message}`);
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image element failed to load'));
    img.src = url;
  });
}

/**
 * Loads the image through a plain <img> tag and re-encodes it via canvas,
 * instead of fetch(). On at least one real device this app has been tested
 * on, fetch() to our storage host throws "TypeError: Load failed" (likely a
 * content blocker or privacy feature) even though the exact same URL loads
 * fine as a normal image resource — this sidesteps that entirely, since
 * image loading doesn't go through the Fetch API.
 */
async function imageToFile(url: string, filename: string): Promise<File | null> {
  try {
    const img = await loadImageElement(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    return blob ? new File([blob], filename, { type: 'image/jpeg' }) : null;
  } catch (err) {
    debugAlert(`טעינת <img> נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function fetchFile(url: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      debugAlert(`fetch חזר סטטוס ${response.status}`);
      return null;
    }
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || undefined });
  } catch (err) {
    debugAlert(`fetch נכשל: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
    return null;
  }
}

/** Best-effort: produces an actual File for the item, trying the method most likely to work first. */
export async function prepareFile(entry: MediaDownloadEntry): Promise<File | null> {
  if (entry.type === 'image') {
    const viaCanvas = await imageToFile(entry.url, entry.filename);
    if (viaCanvas) return viaCanvas;
  }
  return fetchFile(entry.url, entry.filename);
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function openDirectly(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/**
 * Call synchronously inside a click handler with files already prepared
 * ahead of time (via prepareFile, cached before the tap) — Safari silently
 * drops navigator.share() once any async work separates it from the user's
 * original tap.
 */
function shareFilesSync(files: File[]): Promise<boolean> {
  if (files.length === 0 || !isShareSupported() || !navigator.canShare?.({ files })) {
    return Promise.resolve(false);
  }
  return navigator
    .share({ files })
    .then(() => true)
    .catch((err) => {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (!isAbort) debugAlert(`share(files) נכשל: ${err instanceof Error ? err.message : String(err)}`);
      return isAbort;
    });
}

function shareUrlSync(entries: MediaDownloadEntry[]): void {
  if (!isShareSupported()) {
    entries.forEach((entry) => openDirectly(entry.url));
    return;
  }
  const payload = entries.length === 1 ? { url: entries[0].url } : { text: entries.map((e) => e.url).join('\n') };
  navigator.share(payload).catch((err) => {
    if (err instanceof Error && err.name === 'AbortError') return;
    debugAlert(`share(url) נכשל: ${err instanceof Error ? err.message : String(err)}`);
    entries.forEach((entry) => openDirectly(entry.url));
  });
}

/**
 * Shares already-prepared files as real attachments when available (the
 * cache should be populated ahead of time via prepareFile so this call can
 * stay synchronous); otherwise shares the URL(s) as a link/text fallback.
 */
export function shareEntriesSync(entries: MediaDownloadEntry[], fileCache: Map<string, File | null>): void {
  const files = entries
    .map((entry) => fileCache.get(entry.url))
    .filter((file): file is File => !!file);

  if (files.length === entries.length && files.length > 0) {
    shareFilesSync(files).then((handled) => {
      if (!handled) shareUrlSync(entries);
    });
    return;
  }

  shareUrlSync(entries);
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
