import { useState } from 'react';
import type { MediaItem } from '../types';
import MediaGridItem from './MediaGridItem';
import MediaViewer from './MediaViewer';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { saveMediaFile } from '../lib/saveMedia';
import { DownloadIcon, CameraIcon, CloseIcon } from './icons';

interface MediaGridProps {
  items: MediaItem[];
}

export default function MediaGrid({ items }: MediaGridProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
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
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function selectAll() {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function downloadSelected() {
    if (isDownloading) return;
    setIsDownloading(true);

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    for (const item of selectedItems) {
      try {
        const url = publicMediaUrl(item.storage_key);
        const filename = item.storage_key.split('/').pop() ?? 'media';
        await saveMediaFile(url, filename);
      } catch {
        // Skip this item and keep going with the rest of the selection
      }
    }

    setIsDownloading(false);
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
          <button type="button" onClick={downloadSelected} disabled={selectedIds.size === 0 || isDownloading}>
            <DownloadIcon size={16} />
            {selectedIds.size > 0 ? `הורד (${selectedIds.size})` : 'הורד'}
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
