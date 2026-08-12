import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getDeviceId } from '../lib/deviceId';
import { addMyFolder } from '../lib/myFolders';
import { generateQrDataUrl } from '../lib/qrCode';
import { buildJoinUrl } from '../lib/joinUrl';

export default function CreateFolder() {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('נא להזין שם לתיקייה');
      return;
    }

    const deviceId = getDeviceId();
    const { data, error: insertError } = await supabase
      .from('folders')
      .insert({ name: trimmedName, creator_device_id: deviceId })
      .select()
      .single();

    if (insertError || !data) {
      setError('יצירת התיקייה נכשלה, נסה שוב');
      return;
    }

    addMyFolder({
      folderId: data.id,
      name: data.name,
      role: 'creator',
      savedAt: new Date().toISOString(),
    });

    setFolderId(data.id);
    setQrDataUrl(await generateQrDataUrl(buildJoinUrl(data.id)));
  }

  async function handleShare() {
    if (!qrDataUrl) return;
    const response = await fetch(qrDataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'qr-code.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
    } else {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = 'qr-code.png';
      link.click();
    }
  }

  if (folderId && qrDataUrl) {
    return (
      <main className="create-folder">
        <h1>{name}</h1>
        <img src={qrDataUrl} alt="קוד QR להצטרפות לתיקייה" />
        <button type="button" onClick={handleShare}>שתף</button>
        <button type="button" onClick={() => navigate(`/folder/${folderId}`)}>כניסה לתיקייה</button>
      </main>
    );
  }

  return (
    <main className="create-folder">
      <h1>צור תיקייה</h1>
      <form onSubmit={handleCreate}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="שם התיקייה" />
        <button type="submit">צור</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
