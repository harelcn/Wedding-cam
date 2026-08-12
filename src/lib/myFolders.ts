export interface MyFolderEntry {
  folderId: string;
  name: string;
  role: 'creator' | 'joined';
  savedAt: string;
}

const MY_FOLDERS_KEY = 'wedding-cam-my-folders';

export function getMyFolders(): MyFolderEntry[] {
  const raw = localStorage.getItem(MY_FOLDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MyFolderEntry[];
  } catch {
    return [];
  }
}

export function addMyFolder(entry: MyFolderEntry): void {
  const existing = getMyFolders();
  if (existing.some((folder) => folder.folderId === entry.folderId)) return;
  existing.push(entry);
  localStorage.setItem(MY_FOLDERS_KEY, JSON.stringify(existing));
}
