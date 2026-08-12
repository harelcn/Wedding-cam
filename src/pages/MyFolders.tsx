import { Link } from 'react-router-dom';
import { getMyFolders } from '../lib/myFolders';
import { FolderIcon, ArrowStartIcon } from '../components/icons';

export default function MyFolders() {
  const folders = getMyFolders();

  if (folders.length === 0) {
    return (
      <main className="my-folders">
        <h1>התיקיות שלי</h1>
        <div className="empty-state">
          <FolderIcon size={40} />
          <p>עדיין לא יצרת או הצטרפת לאף תיקייה</p>
        </div>
      </main>
    );
  }

  return (
    <main className="my-folders">
      <h1>התיקיות שלי</h1>
      <ul className="folder-list">
        {folders.map((folder) => (
          <li key={folder.folderId}>
            <Link className="folder-list-link" to={`/folder/${folder.folderId}`}>
              <FolderIcon size={20} />
              <span className="folder-list-name">{folder.name}</span>
              <ArrowStartIcon size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
