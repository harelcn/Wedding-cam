import { useRef, useState } from 'react';
import type { MediaItem } from '../types';
import MediaGridItem from './MediaGridItem';
import MediaViewer from './MediaViewer';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { fetchFile, isShareSupported, openDirectly, shareFilesSync, type MediaDownloadEntry } from '../lib/saveMedia';
import { DownloadIcon, CameraIcon, CloseIcon, ShareIcon } from './icons';

interface MediaGridProps {
  items: MediaItem[];
}

function entryFor(item: MediaItem): MediaDownloadEntry {
  return {
    url: publicMediaUrl(item.storage_key),
    filename: item.storage_key.split('/').pop() ?? 'media',
  };
}

export default function MediaGrid({ items }: MediaGridProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const fileCacheRef = useRef<Map<string, File | null>>(new Map());

  function prefetch(id: string) {
    if (fileCacheRef.current.has(id)) return;
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    fileCacheRef.current.set(id, null);
    fetchFile(entryFor(item)).then((file) => {
      fileCacheRef.current.set(id, file);
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        prefetch(id);
      }
      return next;
    });
  }

  function handleTap(item: MediaItem, index: number) {
    if (selectMode) {
      toggleSelected(item.id);
    } else {
      setOpenIndex(index);
    }
  }

  function handleLongPress(item: MediaItem) {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
      prefetch(item.id);
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function selectAll() {
    setSelectedIds(new Set(items.map((item) => item.id)));
    items.forEach((item) => prefetch(item.id));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function selectedItems(): MediaItem[] {
    return items.filter((item) => selectedIds.has(item.id));
  }

  /** Files already fetched for every currently-selected item, or null if any are still missing. */
  function cachedSelectedFiles(): File[] | null {
    const files: File[] = [];
    for (const item of selectedItems()) {
      const file = fileCacheRef.current.get(item.id);
      if (!file) return null;
      files.push(file);
    }
    return files;
  }

  async function shareOrOpenSelected(setBusy: (busy: boolean) => void) {
    const entries = selectedItems().map(entryFor);
    const ready = cachedSelectedFiles();

    if (ready) {
      // Nothing awaited yet in this call — share() fires in the same tick as the click.
      const handled = await shareFilesSync(ready);
      if (!handled) entries.forEach((entry) => openDirectly(entry.url));
      return;
    }

    setBusy(true);
    const files = await Promise.all(entries.map(fetchFile));
    const validFiles = files.filter((file): file is File => file !== null);
    const handled = validFiles.length > 0 ? await shareFilesSync(validFiles) : false;
    if (!handled) entries.forEach((entry) => openDirectly(entry.url));
    setBusy(false);
  }

  function downloadSelected() {
    if (isDownloading) return;
    shareOrOpenSelected(setIsDownloading);
  }

  function shareSelected() {
    if (isSharing) return;
    shareOrOpenSelected(setIsSharing);
  }

  if (items.length === 0) {
    return (
      <div className="empty-grid">
        <CameraIcon size={32} />
        <p>עדיין אין כאן תמונות - תהיו הראשונים לצלם</p>
      </div>
    );
  }

  return (
    <div className="media-grid-wrapper">
      {selectMode && (
        <div className="media-grid-toolbar">
          <button type="button" className="icon-button" onClick={exitSelectMode} aria-label="צא ממצב בחירה">
            <CloseIcon size={16} />
          </button>
          <button type="button" className="secondary" onClick={selectAll}>בחר הכל</button>
          <button type="button" className="secondary" onClick={clearSelection}>נקה בחירה</button>
          {isShareSupported() && (
            <button type="button" onClick={shareSelected} disabled={selectedIds.size === 0 || isSharing}>
              {isSharing ? <span className="spinner spinner-sm" /> : <ShareIcon size={16} />}
              {isSharing ? 'משתף...' : 'שתף'}
            </button>
          )}
          <button type="button" onClick={downloadSelected} disabled={selectedIds.size === 0 || isDownloading}>
            {isDownloading ? <span className="spinner spinner-sm" /> : <DownloadIcon size={16} />}
            {isDownloading ? 'מוריד...' : selectedIds.size > 0 ? `הורד (${selectedIds.size})` : 'הורד'}
          </button>
        </div>
      )}
      <div className="media-grid">
        {items.map((item, index) => (
          <MediaGridItem
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            selectMode={selectMode}
            onTap={() => handleTap(item, index)}
            onLongPress={() => handleLongPress(item)}
          />
        ))}
      </div>
      {openIndex !== null && (
        <MediaViewer items={items} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
