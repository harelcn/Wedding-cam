import { useState } from 'react';
import type { MediaItem } from '../types';
import MediaGridItem from './MediaGridItem';
import { publicMediaUrl } from '../lib/publicMediaUrl';

interface MediaGridProps {
  items: MediaItem[];
}

export default function MediaGrid({ items }: MediaGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  function selectAll() {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function downloadSelected() {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    for (const item of selectedItems) {
      const url = publicMediaUrl(item.storage_key);
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = item.storage_key.split('/').pop() ?? 'media';
      link.click();
      URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <div className="media-grid-wrapper">
      <div className="media-grid-toolbar">
        <button type="button" onClick={selectAll}>בחר הכל</button>
        <button type="button" onClick={clearSelection}>נקה בחירה</button>
        <button type="button" onClick={downloadSelected} disabled={selectedIds.size === 0}>
          הורד ({selectedIds.size})
        </button>
      </div>
      <div className="media-grid">
        {items.map((item) => (
          <MediaGridItem
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onToggle={() => toggleSelected(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
