# Wedding Cam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a general-purpose "shared event album" web app — anyone creates a folder, shares it via QR code, and everyone who joins can capture/upload photos and short videos that sync live to everyone else in that folder, with no login and no delete capability.

**Architecture:** React + Vite + TypeScript SPA hosted on Vercel. Supabase Postgres stores folder/media metadata and pushes realtime updates over a websocket. Cloudflare R2 stores the actual image/video files (zero egress cost). A single Vercel serverless function (`/api/upload-url`) is the only backend code — it signs short-lived R2 upload URLs so R2 credentials never reach the browser. Pure logic (device id, local folder list, QR generation, image resize math, media URL building) is unit-tested with Vitest; UI/camera/QR-scanning components are implementation tasks verified manually in the browser, since they wrap browser APIs (`getUserMedia`, `MediaRecorder`, canvas) that aren't meaningfully testable in jsdom.

**Tech Stack:** React 18, Vite, TypeScript, react-router-dom, @supabase/supabase-js, qrcode, jsqr, @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner (R2 signing), Vitest + @testing-library/react.

---

## File Structure

```
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
index.html
.env.example
.gitignore
api/
  upload-url.ts
src/
  main.tsx
  App.tsx
  theme.css
  types/index.ts
  lib/
    supabaseClient.ts
    deviceId.ts
    myFolders.ts
    imageResize.ts
    compressImage.ts
    joinUrl.ts
    qrCode.ts
    publicMediaUrl.ts
    videoDuration.ts
  components/
    QrScanner.tsx
    CameraCapture.tsx
    MediaGrid.tsx
    MediaGridItem.tsx
  pages/
    Home.tsx
    CreateFolder.tsx
    ScanFolder.tsx
    JoinFolder.tsx
    MyFolders.tsx
    FolderView.tsx
tests/
  lib/
    deviceId.test.ts
    myFolders.test.ts
    imageResize.test.ts
    joinUrl.test.ts
    qrCode.test.ts
    publicMediaUrl.test.ts
  api/
    upload-url.test.ts
  smoke.test.ts
supabase/
  schema.sql
README.md
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/main.tsx` (placeholder, replaced in Task 24)
- Create: `src/App.tsx` (placeholder, replaced in Task 24)

- [ ] **Step 1: Initialize package.json**

Run: `npm init -y`

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
npm install react react-dom react-router-dom @supabase/supabase-js qrcode jsqr @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 3: Install dev dependencies**

Run:
```bash
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node @types/qrcode @vercel/node vitest jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Edit package.json scripts and module type**

Edit `package.json` so the top-level keys include:
```json
{
  "name": "wedding-cam",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```
(leave the `dependencies`/`devDependencies` blocks that npm already generated untouched)

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "api", "tests"]
}
```

- [ ] **Step 6: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 7: Create index.html**

```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wedding Cam</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create .gitignore**

```
node_modules
dist
.env
.env.local
.vercel
```

- [ ] **Step 9: Create .env.example**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_R2_PUBLIC_BASE_URL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

- [ ] **Step 10: Create placeholder entry files so the app boots**

`src/App.tsx`:
```tsx
export default function App() {
  return <div>Wedding Cam</div>;
}
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 11: Verify the app boots**

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173/`); opening it shows "Wedding Cam" text. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore .env.example src/App.tsx src/main.tsx
git commit -m "chore: scaffold Vite React TypeScript project"
```

---

### Task 2: Testing setup (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 2: Write a smoke test**

```ts
import { describe, it, expect } from 'vitest';

describe('test pipeline', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests and verify pipeline works**

Run: `npm test`
Expected: 1 test file, 1 test passed.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts
git commit -m "chore: add Vitest test pipeline"
```

---

### Task 3: Type definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write the types**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Folder and MediaItem types"
```

---

### Task 4: Device identity (`deviceId.ts`)

**Files:**
- Create: `src/lib/deviceId.ts`
- Test: `tests/lib/deviceId.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceId } from '../../src/lib/deviceId';

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a UUID-shaped id when none exists', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns the same id on repeated calls', () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(second).toBe(first);
  });

  it('persists the id to localStorage under a stable key', () => {
    const id = getDeviceId();
    expect(localStorage.getItem('wedding-cam-device-id')).toBe(id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/deviceId.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/deviceId'`

- [ ] **Step 3: Write minimal implementation**

```ts
const DEVICE_ID_KEY = 'wedding-cam-device-id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/deviceId.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/deviceId.ts tests/lib/deviceId.test.ts
git commit -m "feat: add anonymous device id helper"
```

---

### Task 5: "My folders" local list (`myFolders.ts`)

**Files:**
- Create: `src/lib/myFolders.ts`
- Test: `tests/lib/myFolders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getMyFolders, addMyFolder } from '../../src/lib/myFolders';

describe('myFolders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getMyFolders()).toEqual([]);
  });

  it('adds a folder entry and persists it', () => {
    addMyFolder({ folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' });
    expect(getMyFolders()).toEqual([
      { folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('does not add a duplicate folderId', () => {
    addMyFolder({ folderId: 'f1', name: 'Test', role: 'creator', savedAt: '2026-01-01T00:00:00.000Z' });
    addMyFolder({ folderId: 'f1', name: 'Test again', role: 'joined', savedAt: '2026-01-02T00:00:00.000Z' });
    expect(getMyFolders()).toHaveLength(1);
  });

  it('returns an empty array when stored JSON is corrupted', () => {
    localStorage.setItem('wedding-cam-my-folders', '{not valid json');
    expect(getMyFolders()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/myFolders.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/myFolders.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/myFolders.ts tests/lib/myFolders.test.ts
git commit -m "feat: add local my-folders list helper"
```

---

### Task 6: Image resize math + compression (`imageResize.ts`, `compressImage.ts`)

**Files:**
- Create: `src/lib/imageResize.ts`
- Create: `src/lib/compressImage.ts`
- Test: `tests/lib/imageResize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { computeResizedDimensions } from '../../src/lib/imageResize';

describe('computeResizedDimensions', () => {
  it('leaves small images unchanged', () => {
    expect(computeResizedDimensions(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('downscales a wide image to fit the max dimension', () => {
    expect(computeResizedDimensions(4000, 2000, 1920)).toEqual({ width: 1920, height: 960 });
  });

  it('downscales a tall image to fit the max dimension', () => {
    expect(computeResizedDimensions(2000, 4000, 1920)).toEqual({ width: 960, height: 1920 });
  });

  it('leaves an image exactly at the max dimension unchanged', () => {
    expect(computeResizedDimensions(1920, 1080, 1920)).toEqual({ width: 1920, height: 1080 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/imageResize.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export function computeResizedDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = width > height ? maxDimension / width : maxDimension / height;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/imageResize.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write compressImage.ts (uses the browser canvas API — no unit test; verified manually in Task 23)**

```ts
import { computeResizedDimensions } from './imageResize';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file);
  const { width, height } = computeResizedDimensions(imageBitmap.width, imageBitmap.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/imageResize.ts src/lib/compressImage.ts tests/lib/imageResize.test.ts
git commit -m "feat: add image resize math and browser-side compression"
```

---

### Task 7: Join URL builder (`joinUrl.ts`)

**Files:**
- Create: `src/lib/joinUrl.ts`
- Test: `tests/lib/joinUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildJoinUrl } from '../../src/lib/joinUrl';

describe('buildJoinUrl', () => {
  it('builds a join URL from the current origin and folder id', () => {
    expect(buildJoinUrl('abc-123')).toBe(`${window.location.origin}/join/abc-123`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/joinUrl.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildJoinUrl(folderId: string): string {
  return `${window.location.origin}/join/${folderId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/joinUrl.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/joinUrl.ts tests/lib/joinUrl.test.ts
git commit -m "feat: add join URL builder"
```

---

### Task 8: QR code generation (`qrCode.ts`)

**Files:**
- Create: `src/lib/qrCode.ts`
- Test: `tests/lib/qrCode.test.ts`

- [ ] **Step 1: Write the failing test (mocking the `qrcode` package)**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mocked'),
  },
}));

import QRCode from 'qrcode';
import { generateQrDataUrl } from '../../src/lib/qrCode';

describe('generateQrDataUrl', () => {
  it('delegates to qrcode.toDataURL with the given text and returns its result', async () => {
    const result = await generateQrDataUrl('https://example.com/join/abc');

    expect(QRCode.toDataURL).toHaveBeenCalledWith('https://example.com/join/abc', {
      width: 512,
      margin: 2,
    });
    expect(result).toBe('data:image/png;base64,mocked');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/qrCode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 512, margin: 2 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/qrCode.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/qrCode.ts tests/lib/qrCode.test.ts
git commit -m "feat: add QR code data URL generator"
```

---

### Task 9: Public media URL builder (`publicMediaUrl.ts`)

**Files:**
- Create: `src/lib/publicMediaUrl.ts`
- Test: `tests/lib/publicMediaUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { publicMediaUrl } from '../../src/lib/publicMediaUrl';

describe('publicMediaUrl', () => {
  it('joins the base url and storage key', () => {
    expect(publicMediaUrl('folder-1/media-1.jpg', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/folder-1/media-1.jpg'
    );
  });

  it('strips a trailing slash from the base url', () => {
    expect(publicMediaUrl('folder-1/media-1.jpg', 'https://cdn.example.com/')).toBe(
      'https://cdn.example.com/folder-1/media-1.jpg'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/publicMediaUrl.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
export function publicMediaUrl(
  storageKey: string,
  baseUrl: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string
): string {
  return `${baseUrl.replace(/\/$/, '')}/${storageKey}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/publicMediaUrl.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/publicMediaUrl.ts tests/lib/publicMediaUrl.test.ts
git commit -m "feat: add public media URL builder"
```

---

### Task 10: Video duration check (`videoDuration.ts`)

**Files:**
- Create: `src/lib/videoDuration.ts`

Uses real `<video>` element metadata loading, which jsdom cannot decode — implementation-only task, verified manually in Task 23 by uploading a video longer than 60 seconds and confirming it's rejected.

- [ ] **Step 1: Write the implementation**

```ts
export const MAX_VIDEO_DURATION_SECONDS = 60;

export function getVideoDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error('Could not read video metadata'));
    video.src = URL.createObjectURL(file);
  });
}
```

`Blob` (not `File`) so it can validate both uploaded files and in-app recorded/fallback-captured video blobs uniformly — see Task 23.

- [ ] **Step 2: Commit**

```bash
git add src/lib/videoDuration.ts
git commit -m "feat: add video duration reader"
```

---

### Task 11: Supabase client + schema

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write the Supabase client wrapper**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Write the database schema**

```sql
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabaseClient.ts supabase/schema.sql
git commit -m "feat: add Supabase client and database schema"
```

---

### Task 12: R2 upload-url API endpoint

**Files:**
- Create: `api/upload-url.ts`
- Test: `tests/api/upload-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example-signed-url.test'),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn().mockImplementation((input) => input),
}));

import handler from '../../api/upload-url';

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('POST /api/upload-url', () => {
  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
  });

  it('rejects non-POST methods', async () => {
    const req: any = { method: 'GET' };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects a missing folderId', async () => {
    const req: any = { method: 'POST', body: { contentType: 'image/jpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an unsupported contentType', async () => {
    const req: any = { method: 'POST', body: { folderId: 'f1', contentType: 'audio/mpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns a signed upload URL and matching storage key for valid input', async () => {
    const req: any = { method: 'POST', body: { folderId: 'f1', contentType: 'image/jpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.uploadUrl).toBe('https://example-signed-url.test');
    expect(payload.storageKey).toMatch(/^f1\/.+\.jpg$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/upload-url.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { folderId, contentType } = req.body as { folderId?: string; contentType?: string };
  const extension = contentType ? EXTENSION_BY_CONTENT_TYPE[contentType] : undefined;

  if (!folderId || !contentType || !extension) {
    res.status(400).json({ error: 'folderId and a supported contentType are required' });
    return;
  }

  const mediaId = randomUUID();
  const storageKey = `${folderId}/${mediaId}.${extension}`;

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  res.status(200).json({ uploadUrl, storageKey, mediaId });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/upload-url.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add api/upload-url.ts tests/api/upload-url.test.ts
git commit -m "feat: add presigned R2 upload URL endpoint"
```

---

### Task 13: Global theme

**Files:**
- Create: `src/theme.css`

- [ ] **Step 1: Write the theme stylesheet**

```css
:root {
  --color-olive: #6B6E3A;
  --color-olive-dark: #4E5129;
  --color-text: #FFFFFF;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
  background: var(--color-olive);
  color: var(--color-text);
}

button, input, .home-button {
  font-family: inherit;
  font-size: 1rem;
}

button {
  background: var(--color-olive-dark);
  color: var(--color-text);
  border: 1px solid var(--color-text);
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

main {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/theme.css
git commit -m "feat: add olive/white theme"
```

---

### Task 14: QR scanner component

**Files:**
- Create: `src/components/QrScanner.tsx`

Wraps `getUserMedia` + `jsQR`, cannot be meaningfully unit-tested without a real camera — verified manually in Task 23.

- [ ] **Step 1: Write the implementation**

```tsx
import { useEffect, useRef } from 'react';
import jsQR from 'jsqr';

interface QrScannerProps {
  onDecode: (text: string) => void;
}

export default function QrScanner({ onDecode }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let stopped = false;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanLoop();
    }

    function scanLoop() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result) {
            onDecode(result.data);
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDecode]);

  return (
    <div className="qr-scanner">
      <video ref={videoRef} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QrScanner.tsx
git commit -m "feat: add in-app QR scanner component"
```

---

### Task 15: Camera capture component

**Files:**
- Create: `src/components/CameraCapture.tsx`

Wraps `getUserMedia` + `MediaRecorder` + canvas — verified manually in Task 23. Falls back to the phone's native camera app (via `<input capture>`) when `getUserMedia` is unavailable or denied, per the spec's edge-case handling.

- [ ] **Step 1: Write the implementation**

```tsx
import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../lib/compressImage';

interface CameraCaptureProps {
  onPhoto: (blob: Blob) => void;
  onVideo: (blob: Blob) => void;
}

const MAX_VIDEO_DURATION_MS = 60_000;

function pickSupportedVideoMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  return supported ?? 'video/webm';
}

export default function CameraCapture({ onPhoto, onVideo }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true);
      });

    return () => {
      cancelled = true;
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onPhoto(blob);
    }, 'image/jpeg', 0.82);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    recordedChunksRef.current = [];
    const mimeType = pickSupportedVideoMimeType();
    const baseType = mimeType.split(';')[0];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: baseType });
      onVideo(blob);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    stopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_VIDEO_DURATION_MS);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleFallbackFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      onPhoto(compressed);
    } else if (file.type.startsWith('video/')) {
      onVideo(file);
    }
  }

  if (useFallback) {
    return (
      <div className="camera-capture camera-capture-fallback">
        <label className="upload-button">
          פתח מצלמה
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFallbackFile}
            hidden
          />
        </label>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <video ref={videoRef} muted playsInline />
      <div className="camera-controls">
        <button type="button" onClick={takePhoto} disabled={isRecording}>
          צלם תמונה
        </button>
        {isRecording ? (
          <button type="button" onClick={stopRecording}>עצור הקלטה</button>
        ) : (
          <button type="button" onClick={startRecording}>הקלט וידאו</button>
        )}
      </div>
    </div>
  );
}
```

Fallback video (recorded by the phone's own camera app, not our 60-second timer) is still capped by the centralized check in `FolderView.uploadBlob` — see Task 23.

- [ ] **Step 2: Commit**

```bash
git add src/components/CameraCapture.tsx
git commit -m "feat: add in-app photo/video capture component"
```

---

### Task 16: Media grid item component

**Files:**
- Create: `src/components/MediaGridItem.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import type { MediaItem } from '../types';
import { publicMediaUrl } from '../lib/publicMediaUrl';

interface MediaGridItemProps {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
}

export default function MediaGridItem({ item, selected, onToggle }: MediaGridItemProps) {
  const url = publicMediaUrl(item.storage_key);

  return (
    <button type="button" className={`media-grid-item${selected ? ' selected' : ''}`} onClick={onToggle}>
      {item.type === 'image' ? (
        <img src={url} alt="" loading="lazy" />
      ) : (
        <video src={url} muted />
      )}
      <span className="checkbox" aria-hidden="true">{selected ? '✓' : ''}</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MediaGridItem.tsx
git commit -m "feat: add media grid item with selection state"
```

---

### Task 17: Media grid component

**Files:**
- Create: `src/components/MediaGrid.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { useState } from 'react';
import type { MediaItem } from '../types';
import MediaGridItem from './MediaGridItem';
import { publicMediaUrl } from '../lib/publicMediaUrl';

interface MediaGridProps {
  items: MediaItem[];
}

export default function MediaGrid({ items }: MediaGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function downloadSelected() {
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    for (const item of selectedItems) {
      const url = publicMediaUrl(item.storage_key);
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = item.storage_key.split('/').pop() ?? 'media';
      link.click();
      URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <div className="media-grid-wrapper">
      <div className="media-grid-toolbar">
        <button type="button" onClick={selectAll}>בחר הכל</button>
        <button type="button" onClick={clearSelection}>נקה בחירה</button>
        <button type="button" onClick={downloadSelected} disabled={selectedIds.size === 0}>
          הורד ({selectedIds.size})
        </button>
      </div>
      <div className="media-grid">
        {items.map((item) => (
          <MediaGridItem
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onToggle={() => toggleSelected(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MediaGrid.tsx
git commit -m "feat: add media grid with multi-select and download"
```

---

### Task 18: Home page

**Files:**
- Create: `src/pages/Home.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="home">
      <h1>Wedding Cam</h1>
      <Link className="home-button" to="/create">צור תיקייה</Link>
      <Link className="home-button" to="/scan">סרוק קוד</Link>
      <Link className="home-button" to="/my-folders">התיקיות שלי</Link>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: add home page with 3 entry actions"
```

---

### Task 19: Create-folder page

**Files:**
- Create: `src/pages/CreateFolder.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CreateFolder.tsx
git commit -m "feat: add create-folder page with QR generation and share"
```

---

### Task 20: Scan page

**Files:**
- Create: `src/pages/ScanFolder.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { useNavigate } from 'react-router-dom';
import QrScanner from '../components/QrScanner';

export default function ScanFolder() {
  const navigate = useNavigate();

  function handleDecode(text: string) {
    try {
      const url = new URL(text);
      const match = url.pathname.match(/\/join\/([\w-]+)/);
      if (match) {
        navigate(`/join/${match[1]}`);
      }
    } catch {
      // Not a URL — ignore and keep scanning
    }
  }

  return (
    <main className="scan-folder">
      <h1>סרוק קוד</h1>
      <QrScanner onDecode={handleDecode} />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ScanFolder.tsx
git commit -m "feat: add scan page"
```

---

### Task 21: Join-folder page

**Files:**
- Create: `src/pages/JoinFolder.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { addMyFolder } from '../lib/myFolders';
import type { Folder } from '../types';

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
        <p>{error}</p>
        <button type="button" onClick={() => navigate('/')}>חזרה לדף הבית</button>
      </main>
    );
  }

  if (!folder) {
    return <main className="join-folder">טוען...</main>;
  }

  return (
    <main className="join-folder">
      <h1>{folder.name}</h1>
      <button type="button" onClick={handleJoin}>הצטרף</button>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/JoinFolder.tsx
git commit -m "feat: add join-folder confirmation page"
```

---

### Task 22: My-folders page

**Files:**
- Create: `src/pages/MyFolders.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MyFolders.tsx
git commit -m "feat: add my-folders list page"
```

---

### Task 23: Folder view page (camera, upload, gallery, realtime)

**Files:**
- Create: `src/pages/FolderView.tsx`

- [ ] **Step 1: Write the implementation**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
      .then(({ data }) => {
        if (data) setItems(data as MediaItem[]);
      });

    const channel = supabase
      .channel(`media-${folderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: `folder_id=eq.${folderId}` },
        (payload) => {
          setItems((prev) => [payload.new as MediaItem, ...prev]);
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

    await supabase.from('media').insert({
      folder_id: folderId,
      storage_key: storageKey,
      type: mediaType,
      uploader_device_id: getDeviceId(),
      file_size_bytes: blob.size,
    });
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      await uploadBlob(compressed, 'image');
    } else if (file.type.startsWith('video/')) {
      await uploadBlob(file, 'video');
    }
  }

  return (
    <main className="folder-view">
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/FolderView.tsx
git commit -m "feat: add folder view with camera, upload, gallery and realtime sync"
```

---

### Task 24: Wire up routing and verify end-to-end in the browser

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace App.tsx with the real router**

```tsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateFolder from './pages/CreateFolder';
import ScanFolder from './pages/ScanFolder';
import JoinFolder from './pages/JoinFolder';
import MyFolders from './pages/MyFolders';
import FolderView from './pages/FolderView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateFolder />} />
      <Route path="/scan" element={<ScanFolder />} />
      <Route path="/join/:folderId" element={<JoinFolder />} />
      <Route path="/my-folders" element={<MyFolders />} />
      <Route path="/folder/:folderId" element={<FolderView />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Replace main.tsx to add the router and theme**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: All test files pass (deviceId, myFolders, imageResize, joinUrl, qrCode, publicMediaUrl, upload-url, smoke).

- [ ] **Step 4: Create real Supabase and Cloudflare R2 accounts and fill in `.env.local`**

Copy `.env.example` to `.env.local` and fill in real values:
- Supabase: create a project at supabase.com → Project Settings → API → copy "Project URL" into `VITE_SUPABASE_URL` and the `anon` `public` key into `VITE_SUPABASE_ANON_KEY` → run the contents of `supabase/schema.sql` in the Supabase SQL editor
- Cloudflare R2: create a bucket at dash.cloudflare.com → R2 → create an API token with Object Read & Write → copy Account ID into `R2_ACCOUNT_ID`, Access Key ID into `R2_ACCESS_KEY_ID`, Secret Access Key into `R2_SECRET_ACCESS_KEY`, bucket name into `R2_BUCKET_NAME` → enable public access on the bucket (R2.dev subdomain or custom domain) and put that base URL into `VITE_R2_PUBLIC_BASE_URL`

- [ ] **Step 5: Manually verify in the browser**

Run: `vercel dev` (or `npm run dev` for the frontend only, if testing the `/api` route separately isn't needed yet)
Expected, walking through by hand on a phone and a laptop pointed at the same local URL (or after deploying, per Task 25):
1. Home page shows the 3 buttons in the olive/white theme
2. "צור תיקייה" creates a folder and shows a QR code
3. Scanning that QR from a second device shows the join confirmation screen, then enters the folder
4. Taking a photo in one device's folder view appears in the other device's gallery within a couple seconds
5. Recording a 60+ second video is cut off automatically at 60 seconds
6. Selecting items and pressing "הורד" saves each file to the phone's gallery
7. There is no delete control anywhere in the UI

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up application routing"
```

---

### Task 25: README with setup instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Wedding Cam

אתר לאלבום משותף לאירועים: כל אחד יוצר תיקייה, משתף אותה ב-QR, וכל מי שמצטרף מצלם ומעלה תמונות/סרטונים שמסתנכרנים בזמן אמת לכולם. ללא התחברות, ללא אפשרות מחיקה.

## הרצה מקומית

1. `npm install`
2. העתק `.env.example` ל-`.env.local` ומלא את הערכים (ראה "הקמת שירותים" למטה)
3. `npm run dev` — האתר יעלה על `http://localhost:5173`
4. להרצת בדיקות: `npm test`

## הקמת שירותים

### Supabase (מסד נתונים + סנכרון בזמן אמת)
1. צור פרויקט חדש ב-supabase.com
2. ב-SQL editor, הרץ את התוכן של `supabase/schema.sql`
3. ב-Project Settings → API, העתק את ה-Project URL ל-`VITE_SUPABASE_URL` ואת ה-anon public key ל-`VITE_SUPABASE_ANON_KEY`

### Cloudflare R2 (אחסון קבצים)
1. צור bucket חדש ב-dash.cloudflare.com → R2
2. הפעל גישה ציבורית לקריאה (r2.dev subdomain או דומיין מותאם) והכנס את הכתובת ל-`VITE_R2_PUBLIC_BASE_URL`
3. צור API token עם הרשאות Object Read & Write, והכנס את הפרטים ל-`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

### Vercel (הרצה בפרודקשן)
1. חבר את ה-repo הזה לפרויקט חדש ב-Vercel
2. הגדר את כל משתני הסביבה מ-`.env.example` בהגדרות הפרויקט ב-Vercel (Environment Variables)
3. כל push ל-branch הראשי יעלה גרסה חדשה אוטומטית
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup instructions"
```

---

### Task 26: Push to GitHub

**Files:** none (git operations only)

**This task pushes to a shared remote repository. Confirm with the user before running the push step — do not push automatically.**

- [ ] **Step 1: Rename the local branch to match GitHub's default**

```bash
git branch -M main
```

- [ ] **Step 2: Push and set upstream (after explicit user confirmation)**

```bash
git push -u origin main
```

Expected: GitHub shows all commits on `https://github.com/harelcn/Wedding-cam`.
