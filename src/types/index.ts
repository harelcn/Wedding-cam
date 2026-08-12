export interface Folder {
  id: string;
  name: string;
  created_at: string;
  creator_device_id: string;
}

export interface MediaItem {
  id: string;
  folder_id: string;
  storage_key: string;
  type: 'image' | 'video';
  uploader_device_id: string;
  uploaded_at: string;
  file_size_bytes: number;
}
