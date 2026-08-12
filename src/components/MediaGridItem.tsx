import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { CheckIcon, VideoIcon } from './icons';

interface MediaGridItemProps {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
}

export default function MediaGridItem({ item, selected, onToggle }: MediaGridItemProps) {
  const url = publicMediaUrl(item.storage_key);

  const label = item.type === 'image' ? 'תמונה' : 'וידאו';

  return (
    <button
      type="button"
      className={`media-grid-item${selected ? ' selected' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
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
      <span className="checkbox" aria-hidden="true">{selected ? <CheckIcon /> : null}</span>
    </button>
  );
}
