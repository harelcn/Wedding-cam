import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { fetchFile, openDirectly, shareFilesSync } from '../lib/saveMedia';
import { CloseIcon, DownloadIcon } from './icons';

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const CLOSE_SWIPE_THRESHOLD_PX = 90;

function entryFor(item: MediaItem) {
  return {
    url: publicMediaUrl(item.storage_key),
    filename: item.storage_key.split('/').pop() ?? 'media',
  };
}

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isSaving, setIsSaving] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const fileCacheRef = useRef<Map<number, File | null>>(new Map());

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Prefetch the current item (and its neighbors) as soon as it's shown, so
    // the save button can share() synchronously with an already-ready file —
    // Safari drops navigator.share() once any network wait separates it from
    // the user's tap.
    [index - 1, index, index + 1].forEach((i) => {
      if (i < 0 || i >= items.length || fileCacheRef.current.has(i)) return;
      const item = items[i];
      fileCacheRef.current.set(i, null);
      fetchFile(entryFor(item)).then((file) => {
        fileCacheRef.current.set(i, file);
      });
    });
  }, [index, items]);

  function handlePointerDown(event: React.PointerEvent) {
    startRef.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!startRef.current) return;
    setDragX(event.clientX - startRef.current.x);
    setDragY(event.clientY - startRef.current.y);
  }

  function handlePointerUp() {
    if (!startRef.current) return;
    startRef.current = null;
    setIsDragging(false);

    if (Math.abs(dragY) > Math.abs(dragX) && Math.abs(dragY) > CLOSE_SWIPE_THRESHOLD_PX) {
      onClose();
      return;
    }

    const threshold = viewportWidth * 0.2;
    if (dragX <= -threshold && index < items.length - 1) {
      setIndex((prev) => prev + 1);
    } else if (dragX >= threshold && index > 0) {
      setIndex((prev) => prev - 1);
    }

    setDragX(0);
    setDragY(0);
  }

  function handleSave() {
    if (isSaving) return;
    const url = publicMediaUrl(items[index].storage_key);
    const cached = fileCacheRef.current.get(index);

    if (cached) {
      // Already fetched — share synchronously, right in this click handler.
      shareFilesSync([cached]).then((handled) => {
        if (!handled) openDirectly(url);
      });
      return;
    }

    // Not ready yet (opened and tapped save before prefetch finished) — best
    // effort: wait for it, though the delay may cost us the share() window.
    setIsSaving(true);
    fetchFile(entryFor(items[index])).then(async (file) => {
      const handled = file ? await shareFilesSync([file]) : false;
      if (!handled) openDirectly(url);
      setIsSaving(false);
    });
  }

  const trackOffset = -index * viewportWidth + dragX;

  return (
    <div className="media-viewer">
      <div className="media-viewer-top-bar">
        <button type="button" className="icon-button media-viewer-action" onClick={onClose} aria-label="סגור">
          <CloseIcon />
        </button>
        <button
          type="button"
          className="icon-button media-viewer-action"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="שמור לגלריה"
        >
          {isSaving ? <span className="spinner spinner-sm" /> : <DownloadIcon />}
        </button>
      </div>

      <div
        className="media-viewer-track"
        style={{
          transform: `translateX(${trackOffset}px) translateY(${isDragging ? dragY * 0.3 : 0}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {items.map((item, itemIndex) => {
          const isNear = Math.abs(itemIndex - index) <= 1;
          const url = publicMediaUrl(item.storage_key);
          return (
            <div key={item.id} className="media-viewer-slide">
              {isNear &&
                (item.type === 'image' ? (
                  <img src={url} alt="" draggable={false} />
                ) : (
                  <video src={url} controls={itemIndex === index} playsInline muted={itemIndex !== index} />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
