import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getDeviceId } from '../lib/deviceId';
import { compressImage } from '../lib/compressImage';
import { getVideoDuration, MAX_VIDEO_DURATION_SECONDS } from '../lib/videoDuration';
import CameraCapture from '../components/CameraCapture';
import MediaGrid from '../components/MediaGrid';
import type { MediaItem } from '../types';

export default function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!folderId) return;

    supabase
      .from('media')
      .select('*')
      .eq('folder_id', folderId)
      .order('uploaded_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('טעינת הגלריה נכשלה, נסה לרענן');
          return;
        }
        if (data) {
          const fetched = data as MediaItem[];
          setItems((prev) => {
            const extra = prev.filter((item) => !fetched.some((f) => f.id === item.id));
            return [...fetched, ...extra].sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1));
          });
        }
      });

    const channel = supabase
      .channel(`media-${folderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: `folder_id=eq.${folderId}` },
        (payload) => {
          const newItem = payload.new as MediaItem;
          setItems((prev) => (prev.some((item) => item.id === newItem.id) ? prev : [newItem, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folderId]);

  async function uploadBlob(blob: Blob, mediaType: 'image' | 'video') {
    if (!folderId) return;
    setError(null);

    try {
      if (mediaType === 'video') {
        const duration = await getVideoDuration(blob);
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          setError('סרטונים מוגבלים ל-60 שניות');
          return;
        }
      }

      const contentType = blob.type || (mediaType === 'image' ? 'image/jpeg' : 'video/webm');

      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, contentType }),
      });

      if (!response.ok) {
        setError('ההעלאה נכשלה, נסה שוב');
        return;
      }

      const { uploadUrl, storageKey } = await response.json();

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putResponse.ok) {
        setError('ההעלאה נכשלה, נסה שוב');
        return;
      }

      const { error: insertError } = await supabase.from('media').insert({
        folder_id: folderId,
        storage_key: storageKey,
        type: mediaType,
        uploader_device_id: getDeviceId(),
        file_size_bytes: blob.size,
      });

      if (insertError) {
        setError('ההעלאה נכשלה, נסה שוב');
      }
    } catch {
      setError('ההעלאה נכשלה, בדוק את החיבור לאינטרנט ונסה שוב');
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file);
        await uploadBlob(compressed, 'image');
      } catch {
        setError('לא ניתן היה לעבד את התמונה, נסה קובץ אחר');
      }
    } else if (file.type.startsWith('video/')) {
      await uploadBlob(file, 'video');
    }
  }

  return (
    <main className="folder-view">
      <Link to="/my-folders" className="back-link">← התיקיות שלי</Link>
      {error && <p role="alert">{error}</p>}
      <div className="folder-actions">
        <button type="button" onClick={() => setShowCamera((prev) => !prev)}>
          {showCamera ? 'סגור מצלמה' : 'פתח מצלמה'}
        </button>
        <label className="upload-button">
          העלה מהגלריה
          <input type="file" accept="image/*,video/*" onChange={handleFileSelected} hidden />
        </label>
      </div>
      {showCamera && (
        <CameraCapture
          onPhoto={(blob) => uploadBlob(blob, 'image')}
          onVideo={(blob) => uploadBlob(blob, 'video')}
        />
      )}
      <MediaGrid items={items} />
    </main>
  );
}
