import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { prepareFile, shareEntriesSync, type MediaDownloadEntry } from '../lib/saveMedia';
import { CloseIcon, DownloadIcon, ShareIcon } from './icons';

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const CLOSE_SWIPE_THRESHOLD_PX = 90;

function entryFor(item: MediaItem): MediaDownloadEntry {
  return {
    url: publicMediaUrl(item.storage_key),
    filename: item.storage_key.split('/').pop() ?? 'media',
    type: item.type,
  };
}

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const fileCacheRef = useRef<Map<string, File | null>>(new Map());

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Prepare the current item (and neighbors) as soon as it's shown, so the
    // share/save buttons can hand navigator.share() an already-ready file —
    // see saveMedia.ts for why this must happen ahead of the actual tap.
    [index - 1, index, index + 1].forEach((i) => {
      if (i < 0 || i >= items.length) return;
      const entry = entryFor(items[i]);
      if (fileCacheRef.current.has(entry.url)) return;
      fileCacheRef.current.set(entry.url, null);
      prepareFile(entry).then((file) => {
        fileCacheRef.current.set(entry.url, file);
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

  function handleShareOrSave() {
    shareEntriesSync([entryFor(items[index])], fileCacheRef.current);
  }

  const trackOffset = -index * viewportWidth + dragX;

  return (
    <div className="media-viewer">
      <div className="media-viewer-top-bar">
        <button type="button" className="icon-button media-viewer-action" onClick={onClose} aria-label="סגור">
          <CloseIcon />
        </button>
        <div className="media-viewer-actions-group">
          <button
            type="button"
            className="icon-button media-viewer-action"
            onClick={handleShareOrSave}
            aria-label="שתף"
          >
            <ShareIcon />
          </button>
          <button
            type="button"
            className="icon-button media-viewer-action"
            onClick={handleShareOrSave}
            aria-label="שמור לגלריה"
          >
            <DownloadIcon />
          </button>
        </div>
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
