create table folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  creator_device_id text not null
);

create table media (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references folders(id),
  storage_key text not null,
  type text not null check (type in ('image', 'video')),
  uploader_device_id text not null,
  uploaded_at timestamptz not null default now(),
  file_size_bytes integer not null
);

alter table folders enable row level security;
alter table media enable row level security;

-- No update/delete policies are defined on purpose: RLS denies both by default,
-- so deleting or editing folders/media is impossible even with the anon key.
create policy "Anyone can read folders" on folders for select using (true);
create policy "Anyone can create folders" on folders for insert with check (true);

create policy "Anyone can read media" on media for select using (true);
create policy "Anyone can create media" on media for insert with check (true);

alter publication supabase_realtime add table media;
