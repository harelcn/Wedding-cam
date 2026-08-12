import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { addMyFolder } from '../lib/myFolders';
import type { Folder } from '../types';
import { AlertIcon, FolderIcon } from '../components/icons';

export default function JoinFolder() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!folderId) return;
    supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError('הקישור לא תקין');
          return;
        }
        setFolder(data as Folder);
      });
  }, [folderId]);

  function handleJoin() {
    if (!folder) return;
    addMyFolder({
      folderId: folder.id,
      name: folder.name,
      role: 'joined',
      savedAt: new Date().toISOString(),
    });
    navigate(`/folder/${folder.id}`);
  }

  if (error) {
    return (
      <main className="join-folder">
        <div className="empty-state">
          <AlertIcon size={32} />
          <p>{error}</p>
        </div>
        <button type="button" onClick={() => navigate('/')}>חזרה לדף הבית</button>
      </main>
    );
  }

  if (!folder) {
    return (
      <main className="join-folder">
        <div className="spinner" />
      </main>
    );
  }

  return (
    <main className="join-folder">
      <div className="card card-center">
        <FolderIcon size={36} />
        <h1>{folder.name}</h1>
        <p className="subtitle">הצטרף כדי לצלם ולראות את כל התמונות של האירוע</p>
      </div>
      <button type="button" onClick={handleJoin}>הצטרף</button>
    </main>
  );
}
