import { useRef } from 'react';
import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { CheckIcon, VideoIcon } from './icons';

interface MediaGridItemProps {
  item: MediaItem;
  selected: boolean;
  selectMode: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 450;

export default function MediaGridItem({ item, selected, selectMode, onTap, onLongPress }: MediaGridItemProps) {
  const url = publicMediaUrl(item.storage_key);
  const label = item.type === 'image' ? 'תמונה' : 'וידאו';
  const pressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  function startPressTimer() {
    longPressFiredRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function clearPressTimer() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function handleClick() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onTap();
  }

  return (
    <button
      type="button"
      className={`media-grid-item${selected ? ' selected' : ''}`}
      onPointerDown={startPressTimer}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      onContextMenu={(event) => event.preventDefault()}
      onClick={handleClick}
      aria-pressed={selectMode ? selected : undefined}
      aria-label={label}
    >
      {item.type === 'image' ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <>
          <video src={url} muted />
          <span className="type-badge" aria-hidden="true"><VideoIcon /></span>
        </>
      )}
      {selectMode && (
        <span className="checkbox" aria-hidden="true">{selected ? <CheckIcon /> : null}</span>
      )}
    </button>
  );
}
