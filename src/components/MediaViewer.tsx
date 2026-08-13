import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';
import { CloseIcon } from './icons';

interface MediaViewerProps {
  item: MediaItem;
  onClose: () => void;
}

export default function MediaViewer({ item, onClose }: MediaViewerProps) {
  const url = publicMediaUrl(item.storage_key);

  return (
    <div className="media-viewer">
      <button type="button" className="icon-button media-viewer-close" onClick={onClose} aria-label="סגור">
        <CloseIcon />
      </button>
      {item.type === 'image' ? (
        <img src={url} alt="" />
      ) : (
        <video src={url} controls autoPlay playsInline />
      )}
    </div>
  );
}
