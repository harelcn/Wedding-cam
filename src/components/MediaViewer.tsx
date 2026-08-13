import { useRef, useState } from 'react';
import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { CloseIcon } from './icons';

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 50;

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const item = items[index];
  const url = publicMediaUrl(item.storage_key);

  function handleTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (Math.abs(deltaY) > SWIPE_THRESHOLD_PX) {
        onClose();
      }
      return;
    }

    if (deltaX <= -SWIPE_THRESHOLD_PX && index < items.length - 1) {
      setIndex(index + 1);
    } else if (deltaX >= SWIPE_THRESHOLD_PX && index > 0) {
      setIndex(index - 1);
    }
  }

  return (
    <div className="media-viewer" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <button type="button" className="icon-button media-viewer-close" onClick={onClose} aria-label="סגור">
        <CloseIcon />
      </button>
      {item.type === 'image' ? (
        <img key={item.id} src={url} alt="" />
      ) : (
        <video key={item.id} src={url} controls autoPlay playsInline />
      )}
    </div>
  );
}
