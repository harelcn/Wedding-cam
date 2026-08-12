export function buildJoinUrl(folderId: string): string {
  return `${window.location.origin}/join/${folderId}`;
}
