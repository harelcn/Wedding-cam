export async function saveMediaFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type || undefined });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // Sharing failed for a reason other than a deliberate user cancel — fall through to a direct download
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
