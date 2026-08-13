interface DownloadEntry {
  url: string;
  filename: string;
}

async function fetchAsFile({ url, filename }: DownloadEntry): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || undefined });
}

async function fetchAsFiles(entries: DownloadEntry[]): Promise<File[]> {
  const results = await Promise.allSettled(entries.map(fetchAsFile));
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

async function shareOrDownloadFiles(files: File[]): Promise<void> {
  if (files.length === 0) return;

  if (navigator.share && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Sharing failed for a reason other than a deliberate user cancel — fall through to a direct download
    }
  }

  for (const file of files) {
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }
}

export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function saveMediaFile(url: string, filename: string): Promise<void> {
  const file = await fetchAsFile({ url, filename });
  await shareOrDownloadFiles([file]);
}

export async function saveMediaFiles(entries: DownloadEntry[]): Promise<void> {
  const files = await fetchAsFiles(entries);
  await shareOrDownloadFiles(files);
}

export async function shareMediaFiles(entries: DownloadEntry[]): Promise<void> {
  const files = await fetchAsFiles(entries);
  if (files.length === 0 || !navigator.share || !navigator.canShare?.({ files })) return;
  try {
    await navigator.share({ files });
  } catch {
    // Cancelled or failed — nothing more useful to do here
  }
}

export async function shareDataUrlImage(dataUrl: string, filename: string, title?: string): Promise<void> {
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

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
