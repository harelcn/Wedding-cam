import { Link } from 'react-router-dom';
import { getMyFolders } from '../lib/myFolders';

export default function MyFolders() {
  const folders = getMyFolders();

  if (folders.length === 0) {
    return (
      <main className="my-folders">
        <h1>התיקיות שלי</h1>
        <p>עדיין לא יצרת או הצטרפת לאף תיקייה</p>
      </main>
    );
  }

  return (
    <main className="my-folders">
      <h1>התיקיות שלי</h1>
      <ul>
        {folders.map((folder) => (
          <li key={folder.folderId}>
            <Link to={`/folder/${folder.folderId}`}>{folder.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
