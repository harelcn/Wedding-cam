import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getDeviceId } from '../lib/deviceId';
import { compressImage } from '../lib/compressImage';
import { getVideoDuration, MAX_VIDEO_DURATION_SECONDS } from '../lib/videoDuration';
import { generateQrDataUrl } from '../lib/qrCode';
import { buildJoinUrl } from '../lib/joinUrl';
import { shareDataUrlImage } from '../lib/saveMedia';
import CameraCapture from '../components/CameraCapture';
import MediaGrid from '../components/MediaGrid';
import type { MediaItem } from '../types';
import {
  AlertIcon,
  ArrowStartIcon,
  CameraIcon,
  CloseIcon,
  QrCodeIcon,
  ShareIcon,
  UploadIcon,
} from '../components/icons';

export default function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const [folderName, setFolderName] = useState<string>('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!folderId) return;
    supabase
      .from('folders')
      .select('name')
      .eq('id', folderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFolderName(data.name);
      });
  }, [folderId]);

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

  async function handleOpenQr() {
    if (!folderId) return;
    if (!qrDataUrl) {
      setQrDataUrl(await generateQrDataUrl(buildJoinUrl(folderId)));
    }
    setShowQr(true);
  }

  async function handleShareQr() {
    if (!qrDataUrl) return;
    await shareDataUrlImage(qrDataUrl, 'qr-code.png', folderName);
  }

  return (
    <main className="folder-view">
      <div className="folder-view-top-bar">
        <Link to="/my-folders" className="back-link">
          <ArrowStartIcon size={16} />
          חזרה לתיקיות שלי
        </Link>
        <button type="button" className="qr-quick-button" onClick={handleOpenQr}>
          <QrCodeIcon size={20} />
          <span>קוד</span>
        </button>
      </div>
      {error && (
        <div className="error-banner error-toast">
          <span className="error-toast-message">
            <AlertIcon />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)} aria-label="סגור הודעה">
            <CloseIcon size={16} />
          </button>
        </div>
      )}
      <div className="folder-actions">
        <button type="button" onClick={() => setShowCamera(true)}>
          <CameraIcon size={18} />
          פתח מצלמה
        </button>
        <label className="upload-button">
          <UploadIcon size={18} />
          העלה מהגלריה
          <input type="file" accept="image/*,video/*" onChange={handleFileSelected} hidden />
        </label>
      </div>
      {showCamera && (
        <CameraCapture
          onPhoto={(blob) => uploadBlob(blob, 'image')}
          onVideo={(blob) => uploadBlob(blob, 'video')}
          onClose={() => setShowCamera(false)}
        />
      )}
      <MediaGrid items={items} />
      {showQr && qrDataUrl && (
        <div className="qr-modal-overlay" onClick={() => setShowQr(false)}>
          <div className="qr-modal-card card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button qr-modal-close"
              onClick={() => setShowQr(false)}
              aria-label="סגור"
            >
              <CloseIcon size={16} />
            </button>
            <h2>{folderName}</h2>
            <div className="qr-card">
              <img src={qrDataUrl} alt="קוד QR להצטרפות לתיקייה" />
            </div>
            <button type="button" onClick={handleShareQr}>
              <ShareIcon size={18} />
              שתף
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
