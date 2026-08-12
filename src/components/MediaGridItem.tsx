import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';

interface MediaGridItemProps {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
}

export default function MediaGridItem({ item, selected, onToggle }: MediaGridItemProps) {
  const url = publicMediaUrl(item.storage_key);

  return (
    <button type="button" className={`media-grid-item${selected ? ' selected' : ''}`} onClick={onToggle}>
      {item.type === 'image' ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <video src={url} muted />
      )}
      <span className="checkbox" aria-hidden="true">{selected ? '✓' : ''}</span>
    </button>
  );
}
